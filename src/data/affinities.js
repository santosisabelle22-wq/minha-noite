/**
 * Afinidades iniciais disponíveis na criação do personagem.
 * A afinidade de luz NÃO aparece aqui: ela pertence ao poder celestial
 * e só será desbloqueada na história do castelo da Livy (etapa futura).
 */
export const AFFINITIES = [
  {
    id: 'nature',
    name: 'Elfa da Natureza',
    short: 'Natureza',
    icon: '❀',
    color: 0x63c48b,
    cssColor: '#63c48b',
    description: 'Plantas, flores, florestas e criaturas naturais.',
    firstPower: 'Toque da folhagem',
    futurePowers: ['Crescimento delicado', 'Voz dos animais']
  },
  {
    id: 'fire',
    name: 'Guardiã do Fogo',
    short: 'Fogo',
    icon: '✧',
    color: 0xff925e,
    cssColor: '#ff925e',
    description: 'Chamas tranquilas e energia ígnea.',
    firstPower: 'Brasa guardiã',
    futurePowers: ['Dança das chamas', 'Aquecimento mágico']
  },
  {
    id: 'water',
    name: 'Feiticeira das Águas',
    short: 'Águas',
    icon: '◈',
    color: 0x63b9ee,
    cssColor: '#63b9ee',
    description: 'Riachos, gotas e reflexos.',
    firstPower: 'Fio de água',
    futurePowers: ['Sussurro do riacho', 'Ponte de orvalho']
  },
  {
    id: 'air',
    name: 'Fada do Ar',
    short: 'Ar',
    icon: '❋',
    color: 0xbfe4f2,
    cssColor: '#bfe4f2',
    description: 'Vento leve e correntes invisíveis.',
    firstPower: 'Sopro suave',
    futurePowers: ['Passo do vento', 'Redemoinho']
  },
  {
    id: 'shadow',
    name: 'Bruxa das Sombras',
    short: 'Sombras',
    icon: '☾',
    color: 0xa38ad9,
    cssColor: '#a38ad9',
    description: 'Mistérios, sombras e segredos escondidos.',
    firstPower: 'Sombra discreta',
    futurePowers: ['Olhar atento', 'Caminho oculto']
  }
];

export function getAffinity(id) {
  return AFFINITIES.find((item) => item.id === id) || AFFINITIES[0];
}
