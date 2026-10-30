# roleta
Roleta de seleção de nomes, com modo anfitrião e modo espectador em tempo real.

## Como funciona
- **Anfitrião** (`index.html`): ao abrir, assume o controle e **zera o banco** com os dados padrão. Os nomes digitados, o giro e o vencedor são publicados em `roleta/estado`.
- **Espectador** (`index.html?role=viewer`): somente leitura. Renderiza exatamente o estado publicado (mesmas cores, mesmo ângulo, mesmo vencedor, mesmo modal). Não tem nenhum controle e não grava nada.
- O giro é calculado a partir do relógio do servidor, então todos veem a roleta no mesmo ângulo e no mesmo instante.
- Se já houver um anfitrião ativo, quem abrir a página sem `?role=viewer` entra automaticamente como espectador.

## Configuração do Firebase (obrigatória)
A trava que impede espectadores de alterar o banco vive nas **regras do Realtime Database**, não no navegador.

1. **Authentication → Sign-in method → Anonymous**: habilitar.
2. **Realtime Database → Regras**: colar o conteúdo de `database.rules.json` e publicar.
3. Conferir no Realtime Database se `databaseURL` em `sync.js` corresponde à URL exibida no console.

## Estrutura do banco
```
roleta/
  host/    { uid, lastSeen }   anfitrião ativo (renovado a cada 10 s, removido ao desconectar)
  estado/  { entries[], repouso{}, giro{}, foguetes }
```
