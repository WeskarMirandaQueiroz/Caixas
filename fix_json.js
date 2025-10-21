const fs = require('fs');

// Lê o arquivo JSON
const data = JSON.parse(fs.readFileSync('conteudos_iniciais.json', 'utf8'));

// Adiciona _boxNumber a todas as caixas principais
for (let i = 1; i <= 300; i++) {
  const key = String(i);
  if (data.tree[key]) {
    // Adiciona _boxNumber à caixa principal
    data.tree[key]._boxNumber = i;
    
    // Adiciona _boxNumber às subcaixas (1-10)
    for (let j = 1; j <= 10; j++) {
      const subkey = String(j);
      if (data.tree[key][subkey]) {
        // Se for um objeto (não array), adiciona _boxNumber
        if (typeof data.tree[key][subkey] === 'object' && !Array.isArray(data.tree[key][subkey])) {
          data.tree[key][subkey]._boxNumber = j;
        }
      }
    }
  }
}

// Salva o arquivo corrigido
fs.writeFileSync('conteudos_iniciais.json', JSON.stringify(data, null, 2));
console.log('✓ Arquivo conteudos_iniciais.json corrigido com sucesso!');
