import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Package, ShoppingCart, Users, Truck, DollarSign, Plus, Trash2, Search, Save } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

const uid = () => Math.random().toString(36).slice(2, 9).toUpperCase();

const initialData = {
  products: [
    { code: "WHEY-R", name: "Whey Refil", brand: "Importado", costUsd: 15, markup: 30, salePrice: 180, stock: 0 },
    { code: "CREA", name: "Creatina", brand: "Importado", costUsd: 15, markup: 30, salePrice: 140, stock: 0 },
    { code: "CAFE", name: "Cafeína", brand: "Importado", costUsd: 220, markup: 30, salePrice: 0, stock: 0 },
  ],
  sellers: [
    { id: uid(), name: "Vendedor 1", phone: "", notes: "" },
  ],
  purchases: [],
  sales: [],
  consignments: [],
};

function loadData() {
  try {
    return JSON.parse(localStorage.getItem("gr-system-data")) || initialData;
  } catch {
    return initialData;
  }
}

function saveData(data) {
  localStorage.setItem("gr-system-data", JSON.stringify(data));
}

function SectionTitle({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="p-3 rounded-2xl bg-slate-900 text-white shadow-sm"><Icon size={20} /></div>
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <label className="text-sm font-medium text-slate-700">
      {label}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-900 bg-white"
      />
    </label>
  );
}

function Table({ columns, rows, empty = "Nenhum dado cadastrado." }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>{columns.map((c) => <th key={c.key} className="text-left p-3 font-semibold whitespace-nowrap">{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td className="p-5 text-slate-500" colSpan={columns.length}>{empty}</td></tr>
          ) : rows.map((row, i) => (
            <tr key={row.id || row.code || i} className="border-t border-slate-100 hover:bg-slate-50/70">
              {columns.map((c) => <td key={c.key} className="p-3 whitespace-nowrap">{c.render ? c.render(row) : row[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function GRSystem() {
  const [data, setData] = useState(loadData);
  const [tab, setTab] = useState("dashboard");
  const [query, setQuery] = useState("");

  useEffect(() => saveData(data), [data]);

  const totals = useMemo(() => {
    const stockValue = data.products.reduce((s, p) => s + Number(p.stock || 0) * Number(p.salePrice || 0), 0);
    const salesValue = data.sales.reduce((s, v) => s + Number(v.total || 0), 0);
    const consignedQty = data.consignments.reduce((s, c) => s + Number(c.qty || 0), 0);
    const purchaseValue = data.purchases.reduce((s, p) => s + Number(p.totalBrl || 0), 0);
    return { stockValue, salesValue, consignedQty, purchaseValue };
  }, [data]);

  const filteredProducts = data.products.filter(p => `${p.code} ${p.name} ${p.brand}`.toLowerCase().includes(query.toLowerCase()));

  function addProduct(form) {
    setData(d => ({ ...d, products: [...d.products, { ...form, stock: Number(form.stock || 0), costUsd: Number(form.costUsd || 0), markup: Number(form.markup || 0), salePrice: Number(form.salePrice || 0) }] }));
  }

  function deleteProduct(code) {
    setData(d => ({ ...d, products: d.products.filter(p => p.code !== code) }));
  }

  function addPurchase(purchase) {
    const items = purchase.items.filter(i => i.code && Number(i.qty) > 0);
    const subtotalUsd = items.reduce((s, i) => s + Number(i.qty) * Number(i.costUsd), 0);
    const totalUsd = subtotalUsd * (1 + Number(purchase.markup || 0) / 100);
    const totalBrl = totalUsd * Number(purchase.exchange || 0) + Number(purchase.shipping || 0);
    setData(d => {
      const updatedProducts = d.products.map(prod => {
        const item = items.find(i => i.code === prod.code);
        return item ? { ...prod, stock: Number(prod.stock || 0) + Number(item.qty), costUsd: Number(item.costUsd || prod.costUsd) } : prod;
      });
      return { ...d, products: updatedProducts, purchases: [...d.purchases, { ...purchase, id: uid(), items, subtotalUsd, totalUsd, totalBrl }] };
    });
  }

  function addSale(sale) {
    const product = data.products.find(p => p.code === sale.productCode);
    if (!product) return;
    const qty = Number(sale.qty || 0);
    const price = Number(sale.price || product.salePrice || 0);
    const discount = Number(sale.discount || 0);
    const total = qty * price - discount;
    setData(d => ({
      ...d,
      products: d.products.map(p => p.code === sale.productCode ? { ...p, stock: Number(p.stock || 0) - qty } : p),
      sales: [...d.sales, { ...sale, id: uid(), productName: product.name, qty, price, discount, total, date: sale.date || new Date().toISOString().slice(0, 10) }]
    }));
  }

  function addConsignment(c) {
    const product = data.products.find(p => p.code === c.productCode);
    if (!product) return;
    const qty = Number(c.qty || 0);
    setData(d => ({
      ...d,
      products: d.products.map(p => p.code === c.productCode ? { ...p, stock: Number(p.stock || 0) - qty } : p),
      consignments: [...d.consignments, { ...c, id: uid(), productName: product.name, qty, date: c.date || new Date().toISOString().slice(0, 10) }]
    }));
  }

  const nav = [
    ["dashboard", "Dashboard", DollarSign],
    ["products", "Produtos/Estoque", Package],
    ["purchases", "Compras", Truck],
    ["sales", "Vendas", ShoppingCart],
    ["sellers", "Vendedores", Users],
    ["consignments", "Consignados", Package],
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">GR System</h1>
            <p className="text-slate-500">Controle de compras, estoque, vendas, vendedores e consignados</p>
          </div>
          <Button onClick={() => saveData(data)} className="rounded-2xl bg-slate-900 hover:bg-slate-800"><Save className="mr-2" size={16}/> Salvar</Button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
          <aside className="bg-white rounded-3xl p-3 shadow-sm border border-slate-200 h-fit">
            {nav.map(([id, label, Icon]) => (
              <button key={id} onClick={() => setTab(id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left mb-1 transition ${tab === id ? "bg-slate-900 text-white" : "hover:bg-slate-100 text-slate-700"}`}>
                <Icon size={18}/> {label}
              </button>
            ))}
          </aside>

          <motion.main initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {tab === "dashboard" && <Dashboard totals={totals} products={data.products} sales={data.sales} />}
            {tab === "products" && <Products products={filteredProducts} query={query} setQuery={setQuery} addProduct={addProduct} deleteProduct={deleteProduct} />}
            {tab === "purchases" && <Purchases products={data.products} purchases={data.purchases} addPurchase={addPurchase} />}
            {tab === "sales" && <Sales products={data.products} sales={data.sales} addSale={addSale} />}
            {tab === "sellers" && <Sellers sellers={data.sellers} setData={setData} />}
            {tab === "consignments" && <Consignments products={data.products} sellers={data.sellers} consignments={data.consignments} addConsignment={addConsignment} />}
          </motion.main>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ totals, products, sales }) {
  const lowStock = products.filter(p => Number(p.stock) <= 2);
  const cards = [
    ["Valor em estoque", BRL.format(totals.stockValue)],
    ["Vendas registradas", BRL.format(totals.salesValue)],
    ["Valor em compras", BRL.format(totals.purchaseValue)],
    ["Qtd. consignada", totals.consignedQty],
  ];
  return <>
    <SectionTitle icon={DollarSign} title="Dashboard" subtitle="Resumo geral da operação" />
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">{cards.map(([k, v]) => <Card key={k} className="rounded-3xl shadow-sm"><CardContent className="p-5"><p className="text-sm text-slate-500">{k}</p><p className="text-2xl font-black mt-1">{v}</p></CardContent></Card>)}</div>
    <Card className="rounded-3xl shadow-sm"><CardContent className="p-5"><h3 className="font-bold mb-3">Produtos com estoque baixo</h3><Table columns={[{key:"code",label:"Código"},{key:"name",label:"Produto"},{key:"stock",label:"Saldo"}]} rows={lowStock} /></CardContent></Card>
    <Card className="rounded-3xl shadow-sm"><CardContent className="p-5"><h3 className="font-bold mb-3">Últimas vendas</h3><Table columns={[{key:"date",label:"Data"},{key:"client",label:"Cliente"},{key:"productName",label:"Produto"},{key:"total",label:"Total", render:r=>BRL.format(r.total)}]} rows={sales.slice(-6).reverse()} /></CardContent></Card>
  </>;
}

function Products({ products, query, setQuery, addProduct, deleteProduct }) {
  const [form, setForm] = useState({ code: "", name: "", brand: "", costUsd: "", markup: 30, salePrice: "", stock: 0 });
  return <>
    <SectionTitle icon={Package} title="Produtos e estoque" subtitle="Cadastre produtos e acompanhe saldo" />
    <Card className="rounded-3xl shadow-sm"><CardContent className="p-5 grid grid-cols-1 md:grid-cols-4 gap-3">
      <Input label="Código" value={form.code} onChange={v=>setForm({...form, code:v.toUpperCase()})}/>
      <Input label="Produto" value={form.name} onChange={v=>setForm({...form, name:v})}/>
      <Input label="Marca" value={form.brand} onChange={v=>setForm({...form, brand:v})}/>
      <Input label="Custo USD" type="number" value={form.costUsd} onChange={v=>setForm({...form, costUsd:v})}/>
      <Input label="% Acréscimo" type="number" value={form.markup} onChange={v=>setForm({...form, markup:v})}/>
      <Input label="Venda R$" type="number" value={form.salePrice} onChange={v=>setForm({...form, salePrice:v})}/>
      <Input label="Estoque inicial" type="number" value={form.stock} onChange={v=>setForm({...form, stock:v})}/>
      <Button className="self-end rounded-2xl bg-slate-900" onClick={()=>{addProduct(form); setForm({ code:"", name:"", brand:"", costUsd:"", markup:30, salePrice:"", stock:0 });}}><Plus size={16} className="mr-2"/>Cadastrar</Button>
    </CardContent></Card>
    <div className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={18}/><input className="w-full rounded-2xl border border-slate-200 pl-10 pr-3 py-3" placeholder="Buscar produto..." value={query} onChange={e=>setQuery(e.target.value)}/></div>
    <Table columns={[{key:"code",label:"Código"},{key:"name",label:"Produto"},{key:"brand",label:"Marca"},{key:"costUsd",label:"Custo USD", render:r=>USD.format(Number(r.costUsd||0))},{key:"markup",label:"Acréscimo", render:r=>`${r.markup}%`},{key:"salePrice",label:"Venda", render:r=>BRL.format(Number(r.salePrice||0))},{key:"stock",label:"Estoque"},{key:"actions",label:"",render:r=><Button variant="ghost" onClick={()=>deleteProduct(r.code)}><Trash2 size={16}/></Button>}]} rows={products}/>
  </>;
}

function Purchases({ products, purchases, addPurchase }) {
  const [form, setForm] = useState({ code: "", date: new Date().toISOString().slice(0,10), arrival: "", tracking: "", exchange: 5.16, markup: 30, shipping: 50, items: [{ code:"", qty:1, costUsd:0 }] });
  const setItem = (idx, patch) => setForm({...form, items: form.items.map((it,i)=> i===idx ? {...it, ...patch} : it)});
  return <>
    <SectionTitle icon={Truck} title="Compras" subtitle="Registre compras em dólar com cotação, acréscimo e frete" />
    <Card className="rounded-3xl shadow-sm"><CardContent className="p-5 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <Input label="Código da compra" value={form.code} onChange={v=>setForm({...form, code:v})}/>
        <Input label="Data da compra" type="date" value={form.date} onChange={v=>setForm({...form, date:v})}/>
        <Input label="Data chegada" type="date" value={form.arrival} onChange={v=>setForm({...form, arrival:v})}/>
        <Input label="Rastreio" value={form.tracking} onChange={v=>setForm({...form, tracking:v})}/>
        <Input label="Cotação dólar" type="number" value={form.exchange} onChange={v=>setForm({...form, exchange:v})}/>
        <Input label="% Acréscimo" type="number" value={form.markup} onChange={v=>setForm({...form, markup:v})}/>
        <Input label="Frete R$" type="number" value={form.shipping} onChange={v=>setForm({...form, shipping:v})}/>
      </div>
      <div className="space-y-2">
        {form.items.map((it, idx) => <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <select className="rounded-xl border border-slate-200 px-3 py-2" value={it.code} onChange={e=>{ const p = products.find(x=>x.code===e.target.value); setItem(idx, { code:e.target.value, costUsd:p?.costUsd || 0 }); }}><option value="">Produto</option>{products.map(p=><option key={p.code} value={p.code}>{p.code} - {p.name}</option>)}</select>
          <Input label="Qtd" type="number" value={it.qty} onChange={v=>setItem(idx,{qty:v})}/>
          <Input label="Custo USD unit." type="number" value={it.costUsd} onChange={v=>setItem(idx,{costUsd:v})}/>
        </div>)}
        <Button variant="outline" className="rounded-2xl" onClick={()=>setForm({...form, items:[...form.items,{code:"", qty:1, costUsd:0}]})}>Adicionar item</Button>
      </div>
      <Button className="rounded-2xl bg-slate-900" onClick={()=>addPurchase(form)}>Registrar compra e atualizar estoque</Button>
    </CardContent></Card>
    <Table columns={[{key:"code",label:"Compra"},{key:"date",label:"Data"},{key:"tracking",label:"Rastreio"},{key:"totalUsd",label:"Total USD", render:r=>USD.format(r.totalUsd)},{key:"totalBrl",label:"Total R$", render:r=>BRL.format(r.totalBrl)}]} rows={purchases.slice().reverse()}/>
  </>;
}

function Sales({ products, sales, addSale }) {
  const [form, setForm] = useState({ client:"", productCode:"", qty:1, price:"", discount:0, date:new Date().toISOString().slice(0,10) });
  return <>
    <SectionTitle icon={ShoppingCart} title="Vendas" subtitle="Venda baixa automaticamente o estoque" />
    <Card className="rounded-3xl shadow-sm"><CardContent className="p-5 grid grid-cols-1 md:grid-cols-6 gap-3">
      <Input label="Cliente" value={form.client} onChange={v=>setForm({...form, client:v})}/>
      <label className="text-sm font-medium text-slate-700">Produto<select className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" value={form.productCode} onChange={e=>{const p=products.find(x=>x.code===e.target.value); setForm({...form, productCode:e.target.value, price:p?.salePrice||""});}}><option value="">Selecione</option>{products.map(p=><option key={p.code} value={p.code}>{p.name} — estoque {p.stock}</option>)}</select></label>
      <Input label="Qtd" type="number" value={form.qty} onChange={v=>setForm({...form, qty:v})}/>
      <Input label="Preço unit." type="number" value={form.price} onChange={v=>setForm({...form, price:v})}/>
      <Input label="Desconto" type="number" value={form.discount} onChange={v=>setForm({...form, discount:v})}/>
      <Button className="self-end rounded-2xl bg-slate-900" onClick={()=>addSale(form)}>Registrar</Button>
    </CardContent></Card>
    <Table columns={[{key:"date",label:"Data"},{key:"client",label:"Cliente"},{key:"productName",label:"Produto"},{key:"qty",label:"Qtd"},{key:"total",label:"Total", render:r=>BRL.format(r.total)}]} rows={sales.slice().reverse()}/>
  </>;
}

function Sellers({ sellers, setData }) {
  const [form, setForm] = useState({ name:"", phone:"", notes:"" });
  const add = () => { setData(d=>({...d, sellers:[...d.sellers,{...form,id:uid()}]})); setForm({name:"",phone:"",notes:""}); };
  return <>
    <SectionTitle icon={Users} title="Vendedores" subtitle="Cadastre revendedores/parceiros" />
    <Card className="rounded-3xl shadow-sm"><CardContent className="p-5 grid grid-cols-1 md:grid-cols-4 gap-3"><Input label="Nome" value={form.name} onChange={v=>setForm({...form,name:v})}/><Input label="Telefone" value={form.phone} onChange={v=>setForm({...form,phone:v})}/><Input label="Observações" value={form.notes} onChange={v=>setForm({...form,notes:v})}/><Button className="self-end rounded-2xl bg-slate-900" onClick={add}>Cadastrar</Button></CardContent></Card>
    <Table columns={[{key:"name",label:"Nome"},{key:"phone",label:"Telefone"},{key:"notes",label:"Obs."}]} rows={sellers}/>
  </>;
}

function Consignments({ products, sellers, consignments, addConsignment }) {
  const [form, setForm] = useState({ sellerId:"", productCode:"", qty:1, date:new Date().toISOString().slice(0,10), status:"Com vendedor" });
  return <>
    <SectionTitle icon={Package} title="Consignados" subtitle="Controle o que está com cada vendedor" />
    <Card className="rounded-3xl shadow-sm"><CardContent className="p-5 grid grid-cols-1 md:grid-cols-5 gap-3">
      <label className="text-sm font-medium text-slate-700">Vendedor<select className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" value={form.sellerId} onChange={e=>setForm({...form,sellerId:e.target.value})}><option value="">Selecione</option>{sellers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <label className="text-sm font-medium text-slate-700">Produto<select className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" value={form.productCode} onChange={e=>setForm({...form,productCode:e.target.value})}><option value="">Selecione</option>{products.map(p=><option key={p.code} value={p.code}>{p.name} — estoque {p.stock}</option>)}</select></label>
      <Input label="Qtd" type="number" value={form.qty} onChange={v=>setForm({...form,qty:v})}/>
      <Input label="Data" type="date" value={form.date} onChange={v=>setForm({...form,date:v})}/>
      <Button className="self-end rounded-2xl bg-slate-900" onClick={()=>addConsignment(form)}>Enviar consignado</Button>
    </CardContent></Card>
    <Table columns={[{key:"date",label:"Data"},{key:"sellerId",label:"Vendedor", render:r=>sellers.find(s=>s.id===r.sellerId)?.name || "-"},{key:"productName",label:"Produto"},{key:"qty",label:"Qtd"},{key:"status",label:"Status"}]} rows={consignments.slice().reverse()}/>
  </>;
}
