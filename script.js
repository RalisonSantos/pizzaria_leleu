const KEY = "pizzaria_comanda_v1";

const defaultCategories = [
  {id:"pizzas", name:"Pizzas", icon:"🍕", products:[
    ["Margherita","Molho, queijo, tomate e manjericão",39.90,"🍕"],
    ["Calabresa","Calabresa, cebola e queijo",42.90,"🍕"],
    ["Frango com Catupiry","Frango desfiado e catupiry",45.90,"🍕"],
    ["Portuguesa","Presunto, ovo, cebola, ervilha e queijo",44.90,"🍕"],
    ["Quatro Queijos","Muçarela, provolone, parmesão e catupiry",46.90,"🍕"],
    ["Chocolate","Chocolate e morango",41.90,"🍫"]
  ]},
  {id:"bebidas", name:"Bebidas", icon:"🥤", products:[
    ["Coca-Cola 2L","Refrigerante",12.00,"🥤"],["Guaraná 2L","Refrigerante",10.00,"🥤"],
    ["Água 500ml","Água mineral",4.00,"💧"],["Suco Natural","Copo 500ml",8.00,"🧃"],
    ["Cerveja Lata","Lata 350ml",6.50,"🍺"]
  ]},
  {id:"porcoes", name:"Porções", icon:"🍟", products:[
    ["Batata Frita","Porção média",22.00,"🍟"],["Frango à Passarinho","Porção",29.90,"🍗"],
    ["Calabresa Acebolada","Porção",27.90,"🥓"]
  ]},
  {id:"sobremesas", name:"Sobremesas", icon:"🍰", products:[
    ["Pudim","Fatia",9.00,"🍮"],["Brownie","Com calda de chocolate",12.00,"🍫"],["Sorvete","2 bolas",10.00,"🍨"]
  ]}
];


let state = load();
let categories = Array.isArray(state.categories) && state.categories.length ? state.categories : defaultCategories.map(c=>({...c, products:c.products.map(p=>[...p])}));
let currentMesa = state.currentMesa || 1;
if (!Array.isArray(state.mesas) || !state.mesas.length) state.mesas = Array.from({length:6}, (_,i)=>i+1);
let mesas = state.mesas;
let currentCategory = "pizzas";
let editingHistoryId = null;
if (!state.customProducts || typeof state.customProducts !== "object") state.customProducts = {};

function load(){
  try{
    const x=JSON.parse(localStorage.getItem(KEY));
    return x || {orders:{}, history:[], currentMesa:1};
  }catch(e){ return {orders:{},history:[],currentMesa:1}; }
}
function save(){state.currentMesa=currentMesa;state.mesas=mesas;state.categories=categories;localStorage.setItem(KEY,JSON.stringify(state));}
function money(v){return v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});}
function toast(msg){const t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200);}
function getOrder(m=currentMesa){return state.orders[m] || {mesa:m,items:[],status:"open",createdAt:null};}

function renderCategories(){
  const tabs=document.getElementById("categoryTabs");
  tabs.innerHTML=categories.map(c=>
    `<button class="cat-btn ${c.id===currentCategory?"active":""}" data-cat="${c.id}">${escapeHTML(c.icon||"🍽️")} ${escapeHTML(c.name)}</button>`).join("");
  const selected=categories.find(c=>c.id===currentCategory)||categories[0];
  if(selected) currentCategory=selected.id;
  document.getElementById("categoryActions").innerHTML=selected ?
    `<span class="category-actions-label">Gerenciar <strong>${escapeHTML(selected.name)}</strong></span><div class="category-actions-buttons"><button type="button" class="category-edit-btn" id="editSelectedCategory">✏️ Editar categoria</button><button type="button" class="category-delete-btn" id="deleteSelectedCategory">🗑 Excluir categoria</button><button type="button" class="add-category-btn" id="addCategoryBtn">＋ Nova categoria</button></div>` :
    `<button type="button" class="add-category-btn" id="addCategoryBtn">＋ Nova categoria</button>`;
  document.querySelectorAll(".cat-btn[data-cat]").forEach(b=>b.onclick=()=>{currentCategory=b.dataset.cat;renderCategories();renderProducts();});
  const editButton=document.getElementById("editSelectedCategory");
  const deleteButton=document.getElementById("deleteSelectedCategory");
  if(editButton) editButton.onclick=()=>editCategory(currentCategory);
  if(deleteButton) deleteButton.onclick=()=>deleteCategory(currentCategory);
  document.getElementById("addCategoryBtn").onclick=addCategory;
}
function makeCategoryId(name){
  const base=name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"categoria";
  let id=base,n=2;while(categories.some(c=>c.id===id)){id=`${base}-${n++}`;}return id;
}
function addCategory(){
  const name=prompt("Nome da nova categoria:");if(name===null)return;
  if(!name.trim()){toast("Informe o nome da categoria.");return;}
  if(categories.some(c=>c.name.toLowerCase()===name.trim().toLowerCase())){toast("Já existe uma categoria com esse nome.");return;}
  const icon=prompt("Emoji/ícone da categoria (opcional):","🍽️");if(icon===null)return;
  const id=makeCategoryId(name.trim());categories.push({id,name:name.trim(),icon:icon.trim()||"🍽️",products:[]});
  state.customProducts[id]=[];currentCategory=id;save();renderAll();toast("Categoria adicionada.");
}
function editCategory(id){
  const category=categories.find(c=>c.id===id);if(!category)return;
  const name=prompt("Editar nome da categoria:",category.name);if(name===null)return;
  if(!name.trim()){toast("Informe o nome da categoria.");return;}
  if(categories.some(c=>c.id!==id&&c.name.toLowerCase()===name.trim().toLowerCase())){toast("Já existe uma categoria com esse nome.");return;}
  const icon=prompt("Editar emoji/ícone da categoria:",category.icon||"🍽️");if(icon===null)return;
  category.name=name.trim();category.icon=icon.trim()||"🍽️";save();renderAll();toast("Categoria atualizada.");
}
function deleteCategory(id){
  const category=categories.find(c=>c.id===id);if(!category)return;
  if(categories.length===1){toast("O sistema precisa ter pelo menos uma categoria.");return;}
  const productCount=(category.products||[]).length+(state.customProducts[id]||[]).length;
  if(!confirm(`Excluir a categoria "${category.name}" e seus ${productCount} produto(s) do cardápio? Os pedidos já registrados no histórico serão mantidos.`))return;
  categories=categories.filter(c=>c.id!==id);delete state.customProducts[id];
  if(currentCategory===id)currentCategory=categories[0].id;
  save();renderAll();toast("Categoria excluída.");
}
function getCategoryProducts(categoryId=currentCategory){
  const category=categories.find(x=>x.id===categoryId);
  return [...category.products, ...(state.customProducts[categoryId] || [])];
}
function escapeHTML(value){
  return String(value).replace(/[&<>"']/g, ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}
function renderProducts(){
  const c=categories.find(x=>x.id===currentCategory);
  const products=getCategoryProducts();
  const builtInCount=c.products.length;
  document.getElementById("productsCategoryTitle").textContent=`Produtos — ${c.name}`;
  document.getElementById("productGrid").innerHTML=products.map((p,i)=>{
    const isCustom=i>=builtInCount;
    const sourceIndex=isCustom?i-builtInCount:i;
    const source=isCustom?"custom":"default";
    return `<article class="product-card">
      <button class="product" type="button" data-index="${i}" aria-label="Adicionar ${escapeHTML(p[0])} à comanda">
        <div class="product-image product-icon" aria-hidden="true"><span>${escapeHTML((p[3] && p[3] !== "📷") ? p[3] : (c.icon || "🍽️"))}</span></div>
        <h3>${escapeHTML(p[0])}</h3><p>${escapeHTML(p[1])}</p><span class="price">${money(p[2])}</span>
      </button>
      <div class="product-management"><button type="button" class="small product-edit-btn" data-source="${source}" data-product-index="${sourceIndex}">Editar</button><button type="button" class="small product-delete-btn" data-source="${source}" data-product-index="${sourceIndex}">Excluir</button></div>
    </article>`;
  }).join("");
  document.querySelectorAll(".product[data-index]").forEach(b=>b.onclick=()=>addProduct(products[+b.dataset.index]));
  document.querySelectorAll(".product-edit-btn").forEach(b=>b.onclick=()=>editProduct(b.dataset.source,+b.dataset.productIndex));
  document.querySelectorAll(".product-delete-btn").forEach(b=>b.onclick=()=>deleteProduct(b.dataset.source,+b.dataset.productIndex));
}
function getProductList(source){
  const category=categories.find(x=>x.id===currentCategory);
  if(!category)return [];
  if(source==="default")return category.products;
  if(!state.customProducts[currentCategory])state.customProducts[currentCategory]=[];
  return state.customProducts[currentCategory];
}
function editProduct(source,index){
  const list=getProductList(source);
  const product=list[index];
  if(!product)return;
  const name=prompt("Editar nome do produto:",product[0]);
  if(name===null)return;
  if(!name.trim()){toast("Informe o nome do produto.");return;}
  const description=prompt("Editar descrição do produto:",product[1]);
  if(description===null)return;
  const priceText=prompt("Editar preço (ex.: 29,90):",Number(product[2]).toFixed(2).replace(".",","));
  if(priceText===null)return;
  const price=Number(priceText.trim().replace(/\./g,"").replace(",","."));
  if(!Number.isFinite(price)||price<0){toast("Informe um preço válido.");return;}
  product[0]=name.trim();product[1]=description.trim();product[2]=price;
  save();renderProducts();toast("Produto atualizado.");
}
function deleteProduct(source,index){
  const list=getProductList(source);
  const product=list[index];
  if(!product)return;
  if(!confirm(`Excluir o produto "${product[0]}" desta categoria?`))return;
  list.splice(index,1);
  save();renderProducts();toast("Produto excluído do cardápio.");
}
function addProductToCategory(){
  const category=categories.find(x=>x.id===currentCategory);
  const name=prompt(`Nome do novo produto em ${category.name}:`);
  if(name===null)return;
  if(!name.trim()){toast("Informe o nome do produto.");return;}
  const description=prompt("Descrição do produto:", "");
  if(description===null)return;
  const priceText=prompt("Preço do produto (ex.: 29,90):", "0,00");
  if(priceText===null)return;
  const price=Number(priceText.trim().replace(/\./g, "").replace(",", "."));
  if(!Number.isFinite(price)||price<0){toast("Informe um preço válido.");return;}
  if(!state.customProducts[currentCategory])state.customProducts[currentCategory]=[];
  state.customProducts[currentCategory].push([name.trim(),description.trim(),price,category.icon||"🍽️"]);
  save();renderProducts();toast(`${name.trim()} adicionado em ${category.name}.`);
}
function addProduct(p){
  const order=getOrder();
  if(!state.orders[currentMesa]) state.orders[currentMesa]=order;
  const existing=order.items.find(x=>x.name===p[0]);
  if(existing) existing.qty++;
  else order.items.push({name:p[0],price:p[2],qty:1,category:currentCategory});
  order.status="open";
  save();renderAll();toast(`${p[0]} adicionado`);
}
function renderMesas(){
  document.getElementById("mesaStrip").innerHTML=mesas.map(m=>{
    const o=state.orders[m], st=o?.status||"free";
    const label=st==="confirmed"?"Confirmada":st==="cancelled"?"Cancelada":st==="open"?"Em aberto":"Livre";
    return `<button class="mesa-card ${m===currentMesa?"selected":""}" data-mesa="${m}">
      <span class="dot ${st}"></span><strong>Mesa ${String(m).padStart(2,"0")}</strong><small>${label}</small></button>`;
  }).join("");
  document.querySelectorAll(".mesa-card").forEach(b=>b.onclick=()=>selectMesa(+b.dataset.mesa));
}
function selectMesa(m){
  currentMesa=m;save();renderAll();
}
function renderCart(){
  const order=getOrder();
  document.getElementById("currentOrderTitle").textContent=`Mesa ${String(currentMesa).padStart(2,"0")}`;
  const indicator=document.getElementById("mesaIndicator");
  const status=order.status||"free";
  const labels={free:"Livre",open:"Em aberto",confirmed:"Confirmado",cancelled:"Cancelado"};
  indicator.innerHTML=`<i class="${status}"></i><b>${String(currentMesa).padStart(2,"0")}</b><span>${labels[status]}</span>`;
  const cart=document.getElementById("cart"), empty=document.getElementById("emptyCart");
  if(!order.items.length){cart.innerHTML="";empty.style.display="block";}
  else{
    empty.style.display="none";
    cart.innerHTML=order.items.map((x,i)=>`<div class="cart-row">
      <div class="cart-name">${x.name}<small>${money(x.price)} un.</small></div>
      <div class="qty"><button onclick="changeQty(${i},-1)">−</button><span>${x.qty}</span><button onclick="changeQty(${i},1)">+</button></div>
      <div class="cart-price">${money(x.price*x.qty)} <button class="remove" onclick="removeItem(${i})">×</button></div>
    </div>`).join("");
  }
  const total=order.items.reduce((s,x)=>s+x.price*x.qty,0);
  document.getElementById("total").textContent=money(total);
  document.getElementById("confirmBtn").textContent=order.status==="confirmed"?"Pedido confirmado":"Confirmar pedido";
  document.getElementById("confirmBtn").disabled=order.status==="cancelled";
}
function changeQty(i,d){
  const o=getOrder();o.items[i].qty+=d;if(o.items[i].qty<=0)o.items.splice(i,1);save();renderAll();
}
function removeItem(i){getOrder().items.splice(i,1);save();renderAll();}
function clearOrder(){
  if(!confirm("Limpar todos os itens desta comanda?"))return;
  delete state.orders[currentMesa];save();renderAll();toast("Comanda limpa");
}
function confirmOrder(){
  const o=getOrder();
  if(!o.items.length){toast("Adicione pelo menos um produto.");return;}
  if(o.status==="confirmed"){toast("Este pedido já está confirmado.");return;}
  o.status="confirmed";o.createdAt=o.createdAt||new Date().toISOString();
  state.orders[currentMesa]=o;
  if(editingHistoryId){
    const previous=state.history.find(x=>x.id===editingHistoryId);
    if(previous) Object.assign(previous, structuredClone(o), {id:editingHistoryId});
    else state.history.unshift({...structuredClone(o),id:Date.now().toString()});
    editingHistoryId=null;
  }else{
    state.history.unshift({...structuredClone(o),id:Date.now().toString()});
  }
  save();renderAll();toast("Pedido confirmado e salvo no histórico.");
}
function openPage(page){
  document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));
  document.getElementById("page-"+page).classList.add("active");
  document.querySelectorAll(".nav-btn").forEach(x=>x.classList.toggle("active",x.dataset.page===page));
  if(page==="historico")renderHistory();
}
function renderHistory(){
  const list=document.getElementById("historyList"), h=state.history;
  document.getElementById("historyCount").textContent=`${h.length} ${h.length===1?"pedido":"pedidos"}`;
  document.getElementById("selectAll").checked=false;
  if(!h.length){list.innerHTML=`<div class="empty" style="background:#fff;border:1px solid var(--line);border-radius:12px">Nenhum pedido no histórico.</div>`;return;}
  list.innerHTML=h.map(o=>{
    const total=o.items.reduce((s,x)=>s+x.price*x.qty,0);
    const items=o.items.map(x=>`${x.qty}× ${x.name}`).join(" • ");
    const date=o.createdAt?new Date(o.createdAt).toLocaleString("pt-BR"):"—";
    return `<article class="history-card">
      <div class="history-check"><input type="checkbox" class="history-select" data-id="${o.id}"></div>
      <div class="history-main"><div class="history-top"><div><strong class="history-mesa">Mesa ${String(o.mesa).padStart(2,"0")}</strong><span class="history-date">${date}</span></div><span class="status ${o.status}">${o.status==="confirmed"?"CONFIRMADO":"CANCELADO"}</span></div><div class="history-items">${items}</div></div>
      <div class="history-total">${money(total)}</div>
      <div class="history-actions">${o.status==="confirmed"?`<button class="small cancel-btn" onclick="cancelHistory('${o.id}')">Cancelar</button>`:""}<button class="small edit-history-btn" onclick="loadHistory('${o.id}')">Editar</button></div>
    </article>`;
  }).join("");
}
function cancelHistory(id){
  const o=state.history.find(x=>x.id===id);if(!o)return;
  if(!confirm(`Cancelar o pedido da Mesa ${String(o.mesa).padStart(2,"0")}?`))return;
  o.status="cancelled";
  if(state.orders[o.mesa] && state.orders[o.mesa].status==="confirmed") state.orders[o.mesa].status="cancelled";
  save();renderHistory();renderMesas();toast("Pedido cancelado.");
}
function loadHistory(id){
  const o=state.history.find(x=>x.id===id);if(!o)return;
  if(!mesas.includes(o.mesa)){mesas.push(o.mesa);mesas.sort((a,b)=>a-b);}
  currentMesa=o.mesa; editingHistoryId=id;
  state.orders[currentMesa]={mesa:o.mesa,items:structuredClone(o.items),status:"open",createdAt:o.createdAt};
  save();openPage("comandas");renderAll();toast(`Editando pedido da Mesa ${String(o.mesa).padStart(2,"0")}.`);
}
function deleteSelected(){
  const ids=[...document.querySelectorAll(".history-select:checked")].map(x=>x.dataset.id);
  if(!ids.length){toast("Selecione pelo menos um pedido.");return;}
  if(!confirm(`Excluir ${ids.length} pedido(s) do histórico?`))return;
  state.history=state.history.filter(x=>!ids.includes(x.id));save();renderHistory();toast("Histórico atualizado.");
}
function selectAll(v){document.querySelectorAll(".history-select").forEach(x=>x.checked=v);}

function addMesa(){
  const next = mesas.length ? Math.max(...mesas)+1 : 1;
  mesas.push(next); currentMesa=next; save(); renderAll(); toast(`Mesa ${String(next).padStart(2,"0")} adicionada.`);
}
function renderAll(){renderCategories();renderProducts();renderMesas();renderCart();}
document.querySelectorAll(".nav-btn").forEach(b=>b.onclick=()=>openPage(b.dataset.page));
document.getElementById("newOrderBtn").onclick=()=>{delete state.orders[currentMesa];save();renderAll();toast("Nova comanda criada.");};
document.getElementById("clearOrderBtn").onclick=clearOrder;
document.getElementById("confirmBtn").onclick=confirmOrder;
document.getElementById("addMesaBtn").onclick=addMesa;
document.getElementById("addProductBtn").onclick=addProductToCategory;
document.getElementById("deleteSelectedBtn").onclick=deleteSelected;
document.getElementById("selectAll").onchange=e=>selectAll(e.target.checked);
renderAll();
