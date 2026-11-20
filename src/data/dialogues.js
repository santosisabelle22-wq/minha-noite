/**
 * Falas provisórias. A Livy fala de forma natural: é curiosa, sonhadora,
 * gentil e um pouco distraída, sem excesso de linguagem poética.
 * As artes e os textos definitivos serão substituídos depois.
 */

export const INTRO_LINES = [
  'Oi. Você chegou bem na hora em que as luzes da vila começam a acender.',
  'Eu sou a Livy. Costumo cuidar destes caminhos e guardar as histórias que acontecem aqui.',
  'Antes de irmos, me conte um pouco sobre você. O nome, a afinidade... e como gosta de se vestir.',
  'Não se preocupe: nada aqui é para sempre. A gente muda de ideia quantas vezes quiser.'
];

export const TUTORIAL_LINES = {
  start: [
    'Use WASD ou as setas para andar. Shift deixa o passo mais rápido e Espaço dá um pulo.',
    'Se quiser olhar ao redor, arraste o mouse ou deslize o dedo na tela. A câmera gira com você.',
    'Vá até o portal no centro da praça. Ele leva à Floresta Encantada.'
  ],
  forest: [
    'Chegamos. Tem muita coisa escondida entre estas árvores.',
    'Aproxime-se de uma flor luminosa e aperte E para colher. Depois voltamos para a vila.',
    'Quando encontrar algo, aperte I para ver o inventário e J para acompanhar as missões.'
  ],
  collected: [
    'Que bonito. Você já tem uma lembrança nova para guardar.',
    'Vamos voltar ao portal e seguir para a vila. Sua casa está esperando.'
  ]
};

export const INTERACTION_LINES = {
  house: [
    'Esta é a sua casa. Ainda está simples, mas você pode decorá-la do seu jeito.',
    'Por enquanto, ela serve como ponto de descanso. Novas opções de decoração virão depois.'
  ],
  petArea: [
    'Aqui é o espaço dos companheiros. Tem um coelho que costuma aparecer por perto.',
    'Adoção, cuidados e nomes para pets chegam numa próxima etapa.'
  ],
  museum: [
    'Este é o museu mágico. Cada aventura que você termina deixa uma recordação aqui.',
    'A primeira ainda está por vir. Volte depois de concluir uma missão.'
  ],
  missionHall: [
    'A sala das missões guarda os caminhos que você ainda não percorreu.',
    'Deixamos apenas as primeiras tarefas disponíveis por enquanto.'
  ],
  portal: [
    'O portal responde quando você se aproxima. Segure a curiosidade e entre.',
    'Quando quiser voltar, procure o portal do outro lado ou use o mapa.'
  ],
  book: [
    'O livro está aberto numa página sobre estrelas que caem.',
    'Algumas linhas foram apagadas pelo tempo. Talvez a Livy saiba mais.'
  ],
  fox: [
    'Uma raposa luminosa te observa de longe. Ela não tem medo, só está curiosa.',
    'Você a cumprimenta com um gesto tranquilo.'
  ],
  deer: [
    'Um cervo levanta a cabeça e volta a pastar. Certas criaturas preferem manter distância.'
  ],
  well: [
    'A água do poço reflete o céu mesmo quando ele está nublado.',
    'Alguém deixou uma moeda dourada no parapeito.'
  ],
  secret: [
    'Você encontrou um caminho escondido atrás das raízes.',
    'Não é muito, mas já é um segredo seu.'
  ]
};

export const QUEST_TEXT = {
  tutorial: {
    title: 'Primeiros passos',
    steps: [
      { id: 'move', label: 'Ande pela vila com WASD ou toque' },
      { id: 'look', label: 'Gire a câmera ao redor do personagem' },
      { id: 'portal', label: 'Entre no portal para a Floresta Encantada' },
      { id: 'collect', label: 'Colete uma flor luminosa' },
      { id: 'return', label: 'Volte à vila e fale com a Livy' }
    ]
  }
};
