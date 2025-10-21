// Restaura o estado inicial do projeto usando conteudos_iniciais.json
async function restoreInitialState() {
  const resp = await fetch('conteudos_iniciais.json').then(r => r.json()).catch(()=>null);
  if (resp && resp.tree) {
    state.tree = resp.tree;
    state.path = [];
    state.selected = null;
  normalizeAllLevels();
    save();
    renderAll();
    alert('Projeto restaurado ao estado inicial!');
  } else {
    alert('Erro ao restaurar os dados iniciais.');
  }
}
// Caixas - Vanilla JS CRUD em árvore com localStorage
const state = {
  tree: {},
  path: [], // ['Pasta', 'Subpasta']
  selected: null, // {type:'item'|'folder', key, subkey, id}
  nextBoxNumber: 1, // Próximo número de caixa a ser atribuído
};
const LS_KEY = 'caixas:data';
const LS_COUNTER_KEY = 'caixas:counter';

// Atribui números sequenciais 1..limit aos filhos diretos de um nó (ignora _items)
function normalizeChildrenNumbers(node, limit) {
  if (!node || typeof node !== 'object') return;
  const keys = Object.keys(node).filter(k => k !== '_items');
  if (keys.length === 0) return;

  // Se já estiverem 1..N sem repetição, mantém
  const nums = keys
    .map(k => (node[k] && typeof node[k] === 'object') ? Number(node[k]._boxNumber || 0) : 0)
    .filter(n => n > 0)
    .sort((a,b)=>a-b);
  const alreadyOk = (nums.length === keys.length) && nums.every((n,i)=> n === i+1);
  if (alreadyOk) return;

  const ordered = keys.slice().sort((a,b)=>{
    const an = parseInt(a,10), bn = parseInt(b,10);
    const aNum = String(an) === a; const bNum = String(bn) === b;
    if (aNum && bNum) return an - bn;
    if (aNum) return -1; if (bNum) return 1;
    return a.localeCompare(b, 'pt-BR', {numeric:true, sensitivity:'base'});
  });
  let i = 1;
  const max = limit ? Math.min(limit, ordered.length) : ordered.length;
  for (const k of ordered) {
    if (node[k] && typeof node[k] === 'object') {
      node[k]._boxNumber = i;
      i++;
    }
  }
}

// Normaliza root (1..300) e cada subcaixa (1..10)
function normalizeAllLevels() {
  // Root
  normalizeChildrenNumbers(state.tree, 300);
  // Cada caixa de primeiro nível
  const rootKeys = Object.keys(state.tree || {}).filter(k => k !== '_items');
  for (const k of rootKeys) {
    const child = state.tree[k];
    if (child && typeof child === 'object') normalizeChildrenNumbers(child, 10);
  }
  // Define próximo número com base no total de caixas top-level
  const topCount = rootKeys.length;
  state.nextBoxNumber = topCount + 1;
}

async function bootstrap() {
  const existing = localStorage.getItem(LS_KEY);
  if (existing) {
    state.tree = JSON.parse(existing);
  } else {
    const resp = await fetch('conteudos_iniciais.json').then(r => r.json()).catch(()=>null);
    if (resp && resp.tree) state.tree = resp.tree;
    save();
  }

  // Normaliza números das caixas (root e subcaixas)
  normalizeAllLevels();
  save();
  
  const counter = localStorage.getItem(LS_COUNTER_KEY);
  if (counter) {
    state.nextBoxNumber = parseInt(counter, 10);
  } else {
    // Calcula o próximo número baseado nas caixas existentes
    state.nextBoxNumber = calculateNextBoxNumber(state.tree) + 1;
  }
  
  renderList();
  bindUI();
}

function checkIfNeedsMigration(node) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return false;
  
  for (const key in node) {
    if (key[0] === '_') continue;
    const child = node[key];
    if (child && typeof child === 'object') {
      if (!child._boxNumber) return true;
      if (checkIfNeedsMigration(child)) return true;
    }
  }
  return false;
}

function migrateBoxNumbersFromOne(node, counter = {value: 1}) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return;
  
  const keys = Object.keys(node).filter(k => k[0] !== '_');
  
  for (const key of keys) {
    const child = node[key];
    
    if (child && typeof child === 'object') {
      // Atribui número sequencial começando do 1
      child._boxNumber = counter.value;
      counter.value++;
      
      // Processa recursivamente (subcaixas)
      migrateBoxNumbersFromOne(child, counter);
    }
  }
  
  // Atualiza o próximo número global
  state.nextBoxNumber = counter.value;
}

function calculateNextBoxNumber(node, maxNum = 0) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return maxNum;
  for (const key in node) {
    if (key[0] === '_') continue;
    const child = node[key];
    if (child && typeof child === 'object' && child._boxNumber) {
      maxNum = Math.max(maxNum, child._boxNumber);
    }
    maxNum = calculateNextBoxNumber(child, maxNum);
  }
  return maxNum;
}

function save() {
  localStorage.setItem(LS_KEY, JSON.stringify(state.tree));
  localStorage.setItem(LS_COUNTER_KEY, state.nextBoxNumber.toString());
  
  // Sincroniza automaticamente com Excel após cada salvamento
  autoSyncToExcel();
}

function getFolderNode(path=state.path) {
  let node = state.tree;
  for (const p of path) {
    node = node[p];
    if (!node) return null;
  }
  return node;
}

function updateNav() {
  const btnBack = document.getElementById('btn-back');
  const currentPath = document.getElementById('current-path');
  if (!btnBack || !currentPath) return;
  if (state.path.length > 0) {
    btnBack.classList.remove('hidden');
  } else {
    btnBack.classList.add('hidden');
  }
  currentPath.textContent = state.path.length ? `/${state.path.join(' / ')}` : '/';
}

function getNodeItems(node) {
  if (!node) return [];
  if (Array.isArray(node)) return node;
  return node._items || [];
}

function renderList() {
  updateNav();
  const list = document.getElementById('list');
  list.innerHTML = '';
  const node = getFolderNode() ?? state.tree;

  // Caixas (subpastas/keys)
  let subkeys = (node && typeof node === 'object' && !Array.isArray(node))
    ? Object.keys(node).filter(k => k[0] !== '_')
    : [];

  // Ordena as caixas pelo _boxNumber
  subkeys = subkeys.sort((a, b) => {
    const an = (node[a] && node[a]._boxNumber) || 0;
    const bn = (node[b] && node[b]._boxNumber) || 0;
    return an - bn;
  });

  subkeys.forEach((sub) => {
    const subNode = node[sub];
    // Exibe o número fixo salvo na caixa
    const boxNumber = (subNode && subNode._boxNumber) || 0;
    const card = document.createElement('div');
    card.className = 'card caixa';
    card.dataset.title = sub.toLowerCase();
    card.dataset.number = boxNumber;
    card.innerHTML = `
      <div class="title">📦 ${sub}</div>
      <div class="meta">
        <span class="badge">caixa</span>
        <span class="badge">#${boxNumber}</span>
      </div>
      <div class="actions">
        <button data-act="open">Abrir</button>
        <button data-act="rename">Renomear</button>
        <button data-act="delete" class="danger">Excluir</button>
      </div>
    `;
    card.querySelector('[data-act="open"]').onclick = () => { state.path = [...state.path, sub]; renderAll(); };
    card.querySelector('[data-act="rename"]').onclick = () => renameCaixa(state.path, sub);
    card.querySelector('[data-act="delete"]').onclick = () => deleteCaixa(state.path, sub);
    list.appendChild(card);
  });

  // Conteúdos (itens)
  const items = getNodeItems(node).map((x, i) => ({...x, _idx:i}));
  items.forEach(item => {
    const title = (item && item.title) ? item.title : '(sem título)';
    const card = document.createElement('div');
    card.className = 'card conteudo';
    card.dataset.title = title.toLowerCase();
    card.innerHTML = `
      <div class="title">📝 ${title}</div>
      <div class="meta"><span class="badge">conteúdo</span></div>
      <div class="actions">
        <button data-act="edit">Editar</button>
        <button data-act="delete" class="danger">Excluir</button>
      </div>
    `;
    card.querySelector('[data-act="edit"]').onclick = () => openEditor(item);
    card.querySelector('[data-act="delete"]').onclick = () => deleteItem(item);
    card.onclick = (e) => { if (!(e.target instanceof HTMLButtonElement)) openEditor(item); };
    list.appendChild(card);
  });
}

function openEditor(item) {
  state.selected = { type:'item', item, path:[...state.path], idx:item._idx };
  const editor = document.getElementById('editor');
  editor.classList.remove('hidden');
  document.getElementById('editor-title').textContent = (state.path.join(' / ') || 'Raiz');
  document.getElementById('item-title').value = (item && typeof item.title !== 'undefined') ? item.title : '';
  
  // Inicializa a lista de itens se não existir
  if (!item.items) item.items = [];
  renderItemsList();
}

function renderItemsList() {
  const itemsList = document.getElementById('items-list');
  if (!itemsList) return;
  
  const item = state.selected?.item;
  if (!item || !item.items) {
    itemsList.innerHTML = '<p style="color:#999;font-size:.9rem">Nenhum item adicionado ainda.</p>';
    return;
  }
  
  itemsList.innerHTML = '';
  item.items.forEach((subItem, idx) => {
    const div = document.createElement('div');
    div.className = 'list-item';
    div.innerHTML = `
      <span class="item-name">${subItem.name || '(sem nome)'}</span>
      <span class="item-qty">${subItem.qty || ''}</span>
      <button class="btn-remove" data-idx="${idx}">×</button>
    `;
    div.querySelector('.btn-remove').onclick = () => removeSubItem(idx);
    itemsList.appendChild(div);
  });
}

function removeSubItem(idx) {
  if (!state.selected || !state.selected.item) return;
  state.selected.item.items.splice(idx, 1);
  renderItemsList();
}

function closeEditor() {
  state.selected = null;
  document.getElementById('editor').classList.add('hidden');
}

function bindUI() {
  const btnNewFolder = document.getElementById('btn-new-folder');
  if (btnNewFolder) {
    btnNewFolder.onclick = () => {
      const name = prompt('Nome da nova caixa:');
      if (!name) return;
      const node = getFolderNode() || state.tree;
      if (Array.isArray(node)) {
        alert('Não é possível criar uma caixa dentro de uma lista de conteúdos. Volte um nível.');
        return;
      }
      if (node[name]) { alert('Já existe uma caixa com esse nome.'); return; }
      node[name] = { _boxNumber: state.nextBoxNumber };
      state.nextBoxNumber++;
      save(); renderAll();
    };
  }

  document.getElementById('btn-new-item').onclick = () => {
    const node = getFolderNode() || state.tree;
    if (Array.isArray(node)) {
      node.push({ title: 'Novo conteúdo', items: [] });
    } else {
      node._items = node._items || [];
      node._items.push({ title: 'Novo conteúdo', items: [] });
    }
    save(); renderAll();
  };

  document.getElementById('add-item').onclick = () => {
    if (!state.selected || !state.selected.item) return;
    const name = document.getElementById('new-item-name').value.trim();
    const qty = document.getElementById('new-item-qty').value.trim();
    if (!name) {
      alert('Digite a discriminação do item.');
      return;
    }
    state.selected.item.items = state.selected.item.items || [];
    state.selected.item.items.push({ name, qty });
    document.getElementById('new-item-name').value = '';
    document.getElementById('new-item-qty').value = '';
    renderItemsList();
  };

  document.getElementById('search-items').oninput = (e) => {
    const q = e.target.value.toLowerCase();
    const itemsList = document.getElementById('items-list');
    itemsList.querySelectorAll('.list-item').forEach(el => {
      el.style.display = '';
    });
    if (!q) return;
    itemsList.querySelectorAll('.list-item').forEach(el => {
      const name = (el.querySelector('.item-name')?.textContent || '').toLowerCase();
      const qty = (el.querySelector('.item-qty')?.textContent || '').toLowerCase();
      if (!name.includes(q) && !qty.includes(q)) {
        el.style.display = 'none';
      }
    });
  };

  document.getElementById('save-item').onclick = () => {
    if (!state.selected) return;
    const node = getFolderNode(state.selected.path);
    const title = document.getElementById('item-title').value;
    let item;
    if (Array.isArray(node)) {
      item = node[state.selected.idx] || {};
      item.title = title;
      item.items = state.selected.item.items || [];
      node[state.selected.idx] = item;
    } else {
      node._items = node._items || [];
      item = node._items[state.selected.idx] || {};
      item.title = title;
      item.items = state.selected.item.items || [];
      node._items[state.selected.idx] = item;
    }
    save(); renderAll();
    closeEditor();
  };

  // Botão excluir removido do editor

  // Garante que o botão fechar sempre oculta o editor e limpa o estado
  const closeBtn = document.getElementById('close-editor');
  closeBtn.onclick = function(e) {
    e.preventDefault();
    state.selected = null;
    document.getElementById('editor').classList.add('hidden');
  };

  // Fecha com tecla ESC
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      const editor = document.getElementById('editor');
      if (!editor.classList.contains('hidden')) {
        state.selected = null;
        editor.classList.add('hidden');
      }
    }
  });

  // Botão restaurar estado inicial
  const btnRestore = document.getElementById('btn-restore');
  if (btnRestore) {
    btnRestore.onclick = () => {
      if (confirm('Tem certeza que deseja restaurar o estado inicial? Isso apagará todas as alterações.')) {
        restoreInitialState();
      }
    };
  }
  // Import/Export removidos da UI

  // Busca
  document.getElementById('search').oninput = (e) => {
    const q = e.target.value.toLowerCase();
    const list = document.getElementById('list');
    list.querySelectorAll('.card').forEach(el => { el.style.display = ''; });
    if (!q) return;
    list.querySelectorAll('.card').forEach(el => {
      const title = (el.dataset.title || '').toLowerCase();
      const number = el.dataset.number || '';
      // Busca por título ou por número (#)
      if (!title.includes(q) && !number.includes(q.replace('#', ''))) {
        el.style.display = 'none';
      }
    });
  };

  const btnBack = document.getElementById('btn-back');
  if (btnBack) {
    btnBack.onclick = () => {
      if (state.path.length > 0) {
        state.path = state.path.slice(0, -1);
        renderAll();
      }
    };
  }

  // Exportar para Excel
  const btnExportExcel = document.getElementById('btn-export-excel');
  if (btnExportExcel) {
    btnExportExcel.onclick = exportToExcel;
  }

  // Importar do Excel
  const btnImportExcel = document.getElementById('btn-import-excel');
  const fileInput = document.getElementById('file-input');
  if (btnImportExcel && fileInput) {
    btnImportExcel.onclick = () => fileInput.click();
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        if (confirm('Importar dados do Excel? Isso substituirá os dados atuais.')) {
          importFromExcel(file);
        }
        fileInput.value = ''; // Limpa o input
      }
    };
  }
}

function renderAll(){
  renderList();
  // O editor só aparece se houver um conteúdo selecionado E não foi explicitamente fechado
  const editor = document.getElementById('editor');
  if (state.selected) {
    editor.classList.remove('hidden');
  } else {
    editor.classList.add('hidden');
  }
}

function renameCaixa(parentPath, key) {
  const parent = parentPath.length ? getFolderNode(parentPath) : state.tree;
  if (!parent || Array.isArray(parent)) { alert('Não é possível renomear aqui.'); return; }
  const novo = prompt('Novo nome da caixa:', key);
  if (!novo || novo === key) return;
  if (parent[novo]) { alert('Já existe uma caixa com esse nome.'); return; }
  
  // Preserva a ordem das chaves ao renomear
  const keys = Object.keys(parent);
  const newParent = {};
  
  for (const k of keys) {
    if (k === key) {
      // Substitui a chave antiga pela nova, mantendo a posição
      newParent[novo] = parent[key];
    } else {
      newParent[k] = parent[k];
    }
  }
  
  // Limpa o objeto parent e recopia as chaves na ordem correta
  for (const k in parent) {
    delete parent[k];
  }
  for (const k in newParent) {
    parent[k] = newParent[k];
  }
  
  // Se estamos dentro desta caixa renomeada, atualiza o path
  const idx = state.path.findIndex(p => p === key && state.path.slice(0, parentPath.length).join('\u0000') === parentPath.join('\u0000'));
  if (idx >= 0) state.path[idx] = novo;
  save(); renderAll();
}

function deleteCaixa(parentPath, key) {
  if (!confirm(`Excluir a caixa "${key}" e todo o seu conteúdo?`)) return;
  const parent = parentPath.length ? getFolderNode(parentPath) : state.tree;
  if (!parent || Array.isArray(parent)) { alert('Não é possível excluir aqui.'); return; }
  delete parent[key];
  // Se o path atual estava dentro da caixa removida, sobe um nível
  if (state.path[parentPath.length] === key) {
    state.path = state.path.slice(0, parentPath.length);
  }
  save(); renderAll();
}

function deleteItem(item) {
  const node = getFolderNode(state.path);
  if (Array.isArray(node)) node.splice(item._idx, 1);
  else if (node && node._items) node._items.splice(item._idx, 1);
  save(); renderAll();
}

// ============================================
// FUNÇÕES DE SINCRONIZAÇÃO COM EXCEL
// ============================================

// Converte a árvore de dados para formato tabular (array de linhas)
function treeToTableData() {
  const rows = [];
  
  // Cabeçalho
  rows.push(['Caixa #', 'Nome da Caixa', 'Subcaixa #', 'Nome da Subcaixa', 'Conteúdo', 'Item', 'Quantidade']);
  
  function processNode(node, caixaNum = '', caixaNome = '', subcaixaNum = '', subcaixaNome = '', path = []) {
    if (!node || typeof node !== 'object') return;
    
    // Processa itens do nó atual
    const items = getNodeItems(node);
    if (items.length > 0) {
      items.forEach(content => {
        const contentTitle = content.title || '(sem título)';
        if (content.items && content.items.length > 0) {
          content.items.forEach(item => {
            rows.push([
              caixaNum,
              caixaNome,
              subcaixaNum,
              subcaixaNome,
              contentTitle,
              item.name || '',
              item.qty || ''
            ]);
          });
        } else {
          // Conteúdo sem itens
          rows.push([
            caixaNum,
            caixaNome,
            subcaixaNum,
            subcaixaNome,
            contentTitle,
            '',
            ''
          ]);
        }
      });
    }
    
    // Processa subcaixas/pastas
    const keys = Object.keys(node).filter(k => k[0] !== '_');
    keys.forEach(key => {
      const child = node[key];
      if (child && typeof child === 'object') {
        const childBoxNum = child._boxNumber || '';
        
        if (path.length === 0) {
          // Nível 1: Caixas principais
          processNode(child, childBoxNum, key, '', '', [key]);
        } else if (path.length === 1) {
          // Nível 2: Subcaixas
          processNode(child, caixaNum, caixaNome, childBoxNum, key, [...path, key]);
        }
      }
    });
  }
  
  processNode(state.tree);
  return rows;
}

// Exporta para Excel automaticamente (salva no localStorage para download posterior)
function autoSyncToExcel() {
  try {
    const data = treeToTableData();
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Ajusta largura das colunas
    ws['!cols'] = [
      { wch: 10 },  // Caixa #
      { wch: 25 },  // Nome da Caixa
      { wch: 12 },  // Subcaixa #
      { wch: 25 },  // Nome da Subcaixa
      { wch: 30 },  // Conteúdo
      { wch: 30 },  // Item
      { wch: 15 }   // Quantidade
    ];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Caixas');
    
    // Gera o arquivo em formato binário
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
    
    // Salva no localStorage para backup
    localStorage.setItem('caixas:excel-backup', wbout);
    localStorage.setItem('caixas:excel-timestamp', new Date().toISOString());
    
    console.log('✓ Backup Excel sincronizado automaticamente');
  } catch (err) {
    console.error('Erro ao sincronizar Excel:', err);
  }
}

// Exporta e baixa o arquivo Excel
function exportToExcel() {
  try {
    const data = treeToTableData();
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Ajusta largura das colunas
    ws['!cols'] = [
      { wch: 10 },
      { wch: 25 },
      { wch: 12 },
      { wch: 25 },
      { wch: 30 },
      { wch: 30 },
      { wch: 15 }
    ];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Caixas');
    
    // Gera nome do arquivo com data/hora
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `caixas_backup_${timestamp}.xlsx`;
    
    XLSX.writeFile(wb, filename);
    
    alert(`✓ Arquivo Excel exportado: ${filename}`);
  } catch (err) {
    alert('Erro ao exportar Excel: ' + err.message);
    console.error(err);
  }
}

// Importa dados do Excel
function importFromExcel(file) {
  const reader = new FileReader();
  
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      // Reconstrói a árvore a partir das linhas
      const newTree = {};
      let maxBoxNum = 0;
      
      // Pula o cabeçalho (linha 0)
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const [caixaNum, caixaNome, subcaixaNum, subcaixaNome, conteudoTitle, itemName, itemQty] = row;
        
        if (!caixaNome) continue;
        
        // Garante que a caixa existe
        if (!newTree[caixaNome]) {
          newTree[caixaNome] = { _boxNumber: Number(caixaNum) || 0, _items: [] };
          maxBoxNum = Math.max(maxBoxNum, Number(caixaNum) || 0);
        }
        
        let targetNode = newTree[caixaNome];
        
        // Se há subcaixa, cria/acessa ela
        if (subcaixaNome) {
          if (!targetNode[subcaixaNome]) {
            targetNode[subcaixaNome] = { _boxNumber: Number(subcaixaNum) || 0, _items: [] };
          }
          targetNode = targetNode[subcaixaNome];
        }
        
        // Se há conteúdo, cria/acessa ele
        if (conteudoTitle) {
          let content = targetNode._items.find(c => c.title === conteudoTitle);
          if (!content) {
            content = { title: conteudoTitle, items: [] };
            targetNode._items.push(content);
          }
          
          // Se há item, adiciona ao conteúdo
          if (itemName) {
            const existingItem = content.items.find(it => it.name === itemName);
            if (!existingItem) {
              content.items.push({ name: itemName, qty: itemQty || '' });
            }
          }
        }
      }
      
      // Atualiza o estado
      state.tree = newTree;
      state.path = [];
      state.selected = null;
      state.nextBoxNumber = maxBoxNum + 1;
      
      normalizeAllLevels();
      save();
      renderAll();
      
      alert('✓ Dados importados do Excel com sucesso!');
    } catch (err) {
      alert('Erro ao importar Excel: ' + err.message);
      console.error(err);
    }
  };
  
  reader.readAsArrayBuffer(file);
}

// Recupera backup do localStorage
function restoreFromLocalBackup() {
  const backup = localStorage.getItem('caixas:excel-backup');
  const timestamp = localStorage.getItem('caixas:excel-timestamp');
  
  if (!backup) {
    alert('Nenhum backup automático encontrado.');
    return;
  }
  
  const date = timestamp ? new Date(timestamp).toLocaleString('pt-BR') : 'desconhecida';
  
  if (!confirm(`Restaurar backup automático de ${date}?`)) return;
  
  try {
    // Converte base64 de volta para arquivo
    const wb = XLSX.read(backup, { type: 'base64' });
    const filename = `caixas_backup_restaurado_${Date.now()}.xlsx`;
    XLSX.writeFile(wb, filename);
    alert(`✓ Backup restaurado e salvo como: ${filename}`);
  } catch (err) {
    alert('Erro ao restaurar backup: ' + err.message);
    console.error(err);
  }
}

bootstrap();
