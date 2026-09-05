import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight, BookOpen, Brain, Heart, Pause, Play, RotateCcw,
  Shield, Sparkles, Swords, Volume2, VolumeX, Zap
} from "lucide-react";
import "./index.css";
import "./story-media.css";
import MagicBackground from "./components/MagicBackground";

type Screen = "title" | "prologue" | "reading" | "battle" | "ending" | "arsenal";
type Turn = "roberto" | "alana" | "together";
type EndingKey = "alianca" | "sacrificio" | "cartografia" | "amor" | "secreto";

type CharacterBuild = {
  className: string;
  outfit: string;
  powers: string[];
  items: string[];
  unlockedPowers: string[];
  unlockedItems: string[];
};

type GameState = {
  screen: Screen;
  prologueStep: number;
  nodeId: string;
  chapter: number;
  turn: Turn;
  history: string[];
  affection: number;
  trust: number;
  tension: number;
  courage: number;
  curiosity: number;
  robertoHp: number;
  robertoMaxHp: number;
  alanaHp: number;
  alanaMaxHp: number;
  bossHp: number;
  bossMaxHp: number;
  powers: string[];
  items: string[];
  robertoBuild: CharacterBuild;
  alanaBuild: CharacterBuild;
  arsenalOpenFrom: Screen;
  flags: string[];
  memories: string[];
  muted: boolean;
  paused: boolean;
  endingKey?: EndingKey;
};

type Choice = {
  id: string;
  label: string;
  hint: string;
  actor: Turn;
  target?: string;
  battle?: boolean;
  ending?: EndingKey;
  show?: (s: GameState) => boolean;
  effect: (s: GameState) => Partial<GameState>;
};

type StoryNode = {
  chapter: number;
  chapterTitle: string;
  title: string;
  location: string;
  mood: string;
  cinematic?: "portal" | "flash" | "spider" | "boss";
  paragraphs: (s: GameState) => string[];
  quote?: (s: GameState) => string;
  choices: Choice[];
};

const SAVE_KEY = "vespera-oraculo-v2";
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const addUnique = (a: string[], v: string) => a.includes(v) ? a : [...a, v];

const emptyGame: GameState = {
  screen: "title", prologueStep: 0, nodeId: "portal", chapter: 1,
  turn: "together", history: [], affection: 0, trust: 0, tension: 0,
  courage: 0, curiosity: 0, robertoHp: 1000, robertoMaxHp: 1000,
  alanaHp: 1000, alanaMaxHp: 1000, bossHp: 0, bossMaxHp: 0,
  powers: [],
  items: [],
  robertoBuild: { className: "Guardião", outfit: "Aventureiro", powers: ["Escudo Temporal"], items: [], unlockedPowers: ["Supervelocidade", "Teletransporte", "Fogo Arcano", "Escudo Temporal"], unlockedItems: ["Poção de Vespera", "Anel do Eco", "Fragmento Estelar", "Capa da Fênix"] },
  alanaBuild: { className: "Oráculo", outfit: "Aventureira", powers: ["Cura Lunar"], items: [], unlockedPowers: ["Teletransporte", "Fogo Arcano", "Cura Lunar", "Ilusão"], unlockedItems: ["Poção de Vespera", "Colar Lunar", "Cristal do Destino", "Capa da Fênix"] },
  arsenalOpenFrom: "reading",
  flags: [], memories: [], muted: false, paused: false
};

function loadSave(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    return { ...emptyGame, ...parsed };
  } catch { return null; }
}

function saveGame(s: GameState) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch {}
}

function adaptiveProfile(s: GameState) {
  const traits: string[] = [];
  if (s.courage >= 4) traits.push("corajosos");
  if (s.curiosity >= 4) traits.push("investigadores");
  if (s.trust >= 5) traits.push("inseparáveis");
  if (s.tension >= 5) traits.push("intensos");
  if (!traits.length) traits.push("imprevisíveis");
  return traits.join(", ");
}

function consequenceText(s: GameState) {
  if (s.trust >= 6 && s.affection >= 6) return "O Oráculo aprendeu uma coisa perigosa: quando um cai, o outro não aceita ficar para trás.";
  if (s.courage >= 6) return "Vespera já espera que vocês escolham o caminho mais perigoso. E isso começou a abrir portas que não existiam.";
  if (s.curiosity >= 6) return "As perguntas de vocês chamaram atenção de algo antigo. A cidade começou a responder.";
  return "Vespera está observando. Cada escolha foi gravada na memória do Oráculo.";
}

const CLASS_DATA: Record<string, { power: string; bonus: string }> = {
  "Guardião": { power: "Escudo Temporal", bonus: "resistência e proteção do parceiro" },
  "Velocista": { power: "Supervelocidade", bonus: "esquivas e ações rápidas" },
  "Piromante": { power: "Fogo Arcano", bonus: "dano elemental e ataques em área" },
  "Viajante": { power: "Teletransporte", bonus: "movimentação instantânea" },
  "Oráculo": { power: "Cura Lunar", bonus: "cura e leitura de possibilidades" },
  "Ilusionista": { power: "Ilusão", bonus: "confusão e manipulação do campo" }
};

const OUTFITS = [
  ["Aventureiro", "Traje de entrada em Vespera"],
  ["Armadura Celeste", "Proteção forjada nas estrelas"],
  ["Casaco do Velocista", "Leve como um raio"],
  ["Manto Arcano", "Tecido com magia viva"],
  ["Roupa do Aranha", "Um aceno ao herói que vocês conheceram"],
  ["Traje Real de Vespera", "Elegância para quem já virou lenda"]
];

const nodes: Record<string, StoryNode> = {
  portal: {
    chapter: 1, chapterTitle: "ARCO I — O ORÁCULO", title: "A noite em que Vespera abriu os olhos",
    location: "Observatório de Vespera", mood: "A realidade está ficando fina.", cinematic: "portal",
    paragraphs: s => [
      "23h47. Roberto e Alana estão juntos quando todas as luzes piscam ao mesmo tempo.",
      "Não é falta de energia. É como se alguma coisa tivesse desligado o mundo por três segundos.",
      "Quando a luz volta, há uma porta onde antes existia apenas uma parede. Ela pulsa como um coração.",
      `Uma voz sussurra: “Eu estava esperando por vocês, ${s.affection > 0 ? "dois" : "dois nomes que ainda não sabem o que significam"}.”`
    ],
    quote: () => "“Entrem juntos. Ou não entrem.”",
    choices: [
      { id: "portal-together", actor: "together", label: "Entrar juntos", hint: "Confiar um no outro e atravessar a porta.", target: "city", effect: s => ({ trust: s.trust + 2, affection: s.affection + 2, flags: addUnique(s.flags, "entrou-junto"), memories: [...s.memories, "Vocês atravessaram a primeira porta de mãos dadas."] }) },
      { id: "portal-roberto", actor: "roberto", label: "Roberto entra primeiro", hint: "Testar o perigo antes de deixar Alana atravessar.", target: "city", effect: s => ({ courage: s.courage + 2, trust: s.trust + 1, flags: addUnique(s.flags, "roberto-protegeu"), memories: [...s.memories, "Roberto entrou primeiro para proteger Alana."] }) },
      { id: "portal-alana", actor: "alana", label: "Alana investiga a porta", hint: "Descobrir o que existe do outro lado antes de agir.", target: "city", effect: s => ({ curiosity: s.curiosity + 2, trust: s.trust + 1, flags: addUnique(s.flags, "alana-investigou"), memories: [...s.memories, "Alana descobriu uma runa escondida na porta."] }) }
    ]
  },
  city: {
    chapter: 1, chapterTitle: "ARCO I — O ORÁCULO", title: "A cidade que não deveria existir",
    location: "Vespera", mood: "Magia, neon e criaturas impossíveis.", cinematic: "flash",
    paragraphs: s => [
      "Vocês caem de pé em uma cidade gigantesca, construída sobre ilhas flutuantes.",
      "Dragões passam entre prédios. Uma lua azul gira ao redor de outra lua. E, em uma praça distante, alguém grita que o Homem-Aranha está preso em uma teia temporal.",
      "Antes que vocês possam processar isso, um velocista vermelho atravessa a rua e deixa um raio no ar.",
      "Ele para por um segundo. Olha para vocês. “Vocês são novos por aqui. Péssimo momento para chegar.”",
      "É o Flash. E ele está assustado."
    ],
    quote: s => s.curiosity > s.courage ? "“Se querem respostas, parem de correr e comecem a perguntar.”" : "“Se querem sobreviver, aprendam a correr.”",
    choices: [
      { id: "flash-help", actor: "together", label: "Ajudar o Flash", hint: "Vocês entram na confusão imediatamente.", target: "spider", effect: s => ({ courage: s.courage + 2, trust: s.trust + 1, flags: addUnique(s.flags, "aliado-flash"), memories: [...s.memories, "O Flash viu vocês lutando lado a lado."] }) },
      { id: "flash-question", actor: "alana", label: "Alana pergunta o que está acontecendo", hint: "Antes de agir, descobrir quem está causando a ruptura.", target: "spider", effect: s => ({ curiosity: s.curiosity + 2, affection: s.affection + 1, flags: addUnique(s.flags, "pista-flash"), memories: [...s.memories, "Alana conseguiu uma pista diretamente do Flash."] }) },
      { id: "flash-risk", actor: "roberto", label: "Roberto segue o raio vermelho", hint: "Seguir o Flash para descobrir a origem do caos.", target: "spider", effect: s => ({ courage: s.courage + 3, tension: s.tension + 1, flags: addUnique(s.flags, "perseguiu-flash"), memories: [...s.memories, "Roberto seguiu o Flash por uma avenida impossível."] }) }
    ]
  },
  spider: {
    chapter: 2, chapterTitle: "ARCO II — A GUERRA DAS DIMENSÕES", title: "O homem por trás da máscara",
    location: "Distrito das Teias", mood: "Humor no meio do perigo.", cinematic: "spider",
    paragraphs: s => [
      "Uma teia passa raspando pela cabeça de Roberto.", "“Foi mal!”",
      "Homem-Aranha cai de cabeça para baixo diante de vocês. “Então vocês são o casal que o Oráculo está procurando. Legal. Nada assustador nisso.”",
      "Ele aponta para o céu. Uma rachadura está crescendo sobre Vespera.",
      "“A coisa que está vindo de lá não quer conquistar a cidade. Quer apagar a história dela.”",
      `O Aranha observa vocês por alguns segundos. “E pelo jeito, vocês são ${adaptiveProfile(s)}. Isso pode ser útil... ou extremamente perigoso.”`
    ],
    quote: () => "“Grandes responsabilidades, grandes monstros e absolutamente nenhuma garantia de reembolso.”",
    choices: [
      { id: "spider-joke", actor: "together", label: "Entrar na brincadeira do Aranha", hint: "Responder com humor mesmo com o mundo acabando.", target: "rift", effect: s => ({ affection: s.affection + 2, tension: Math.max(0, s.tension - 1), flags: addUnique(s.flags, "humor-aranha"), memories: [...s.memories, "Vocês fizeram piada quando deveriam estar com medo."] }) },
      { id: "spider-trust", actor: "alana", label: "Alana pergunta se ele confia em vocês", hint: "Construir uma aliança antes da batalha.", target: "rift", effect: s => ({ trust: s.trust + 2, curiosity: s.curiosity + 1, flags: addUnique(s.flags, "aliado-aranha"), memories: [...s.memories, "Alana conquistou a confiança do Aranha."] }) },
      { id: "spider-power", actor: "roberto", label: "Roberto pede treinamento", hint: "Aprender a usar o poder de Vespera.", target: "rift", effect: s => ({ courage: s.courage + 2, powers: addUnique(s.powers, "Instinto-Aranha"), flags: addUnique(s.flags, "treino-aranha"), memories: [...s.memories, "Roberto aprendeu a sentir o perigo antes que ele aconteça."] }) }
    ]
  },
  rift: {
    chapter: 2, chapterTitle: "ARCO II — A GUERRA DAS DIMENSÕES", title: "A primeira escolha que dói",
    location: "Ponte Celeste", mood: "O céu está desabando.",
    paragraphs: s => [
      "A rachadura finalmente se abre.",
      "Centenas de criaturas de sombra atravessam o céu. O Flash corre para evacuar a cidade. O Homem-Aranha prende uma ponte inteira com teias.",
      "Mas uma criatura maior surge atrás deles: O Devorador de Instantes.",
      "Ele não ataca vocês. Ele aponta para duas pessoas presas do outro lado da ponte.",
      "“Escolham.”",
      "Salvar desconhecidos significa deixar o monstro se aproximar. Atacar significa abandonar quem está preso."
    ],
    quote: () => "“Toda história tem um preço. A pergunta é quem vai pagar.”",
    choices: [
      { id: "save", actor: "alana", label: "Alana salva os desconhecidos", hint: "A vida vem antes da vantagem.", target: "boss1", effect: s => ({ trust: s.trust + 2, affection: s.affection + 2, tension: s.tension + 1, alanaHp: clamp(s.alanaHp - 80, 0, s.alanaMaxHp), flags: addUnique(s.flags, "salvou-desconhecidos"), memories: [...s.memories, "Alana escolheu salvar duas vidas, mesmo sabendo o preço."] }) },
      { id: "attack", actor: "roberto", label: "Roberto enfrenta o Devorador", hint: "Criar uma abertura para todos.", target: "boss1", effect: s => ({ courage: s.courage + 3, tension: s.tension + 2, robertoHp: clamp(s.robertoHp - 120, 0, s.robertoMaxHp), flags: addUnique(s.flags, "enfrentou-devorador"), memories: [...s.memories, "Roberto enfrentou o Devorador de Instantes de frente."] }) },
      { id: "together-save", actor: "together", label: "Salvar juntos", hint: "Roberto distrai o monstro enquanto Alana resgata as pessoas.", target: "boss1", effect: s => ({ trust: s.trust + 3, affection: s.affection + 2, courage: s.courage + 1, flags: addUnique(s.flags, "resgate-duplo"), memories: [...s.memories, "Vocês inventaram uma estratégia juntos e salvaram todos."] }) }
    ]
  },
  boss1: {
    chapter: 3, chapterTitle: "ARCO III — O ABISMO", title: "CHEFE: O DEVORADOR DE INSTANTES",
    location: "Ponte Celeste — Arena", mood: "Primeiro grande combate.", cinematic: "boss",
    paragraphs: s => [
      "O Devorador de Instantes fecha a mão.",
      "A ponte envelhece. Prédios viram ruínas em segundos.",
      "Uma contagem aparece no céu: 03:00.",
      "O Oráculo sussurra: “Vocês não precisam derrotá-lo sozinhos. Precisam descobrir como lutar como dois.”",
      `Memória adaptativa: ${consequenceText(s)}`
    ],
    choices: [
      { id: "combo", actor: "together", label: "⚡ Golpe combinado", hint: "Unir os poderes e atacar no mesmo instante.", battle: true, target: "romance", effect: s => ({ bossHp: s.bossHp - 3800, affection: s.affection + 2, trust: s.trust + 2, powers: addUnique(s.powers, "Pulso Duplo"), memories: [...s.memories, "O primeiro golpe combinado nasceu na Ponte Celeste."] }) },
      { id: "roberto-attack", actor: "roberto", label: "⚔️ Roberto ataca", hint: "Assumir o risco e abrir a defesa.", battle: true, target: "boss1", effect: s => ({ bossHp: s.bossHp - 2500, robertoHp: clamp(s.robertoHp - 160, 0, s.robertoMaxHp), courage: s.courage + 2 }) },
      { id: "alana-strategy", actor: "alana", label: "🔮 Alana cria uma armadilha", hint: "Ler o padrão do chefe e fazê-lo atacar a si mesmo.", battle: true, target: "boss1", effect: s => ({ bossHp: s.bossHp - 2100, alanaHp: clamp(s.alanaHp - 90, 0, s.alanaMaxHp), curiosity: s.curiosity + 2 }) },
      { id: "heal", actor: "together", label: "❤️ Proteger e curar", hint: "Recuperar o parceiro antes do próximo ataque.", battle: true, target: "boss1", effect: s => ({ robertoHp: clamp(s.robertoHp + 220, 0, s.robertoMaxHp), alanaHp: clamp(s.alanaHp + 220, 0, s.alanaMaxHp), trust: s.trust + 1 }) }
    ]
  },
  romance: {
    chapter: 3, chapterTitle: "ARCO III — O ABISMO", title: "Depois da batalha",
    location: "Terraço da Torre do Relógio", mood: "Silêncio depois da tempestade.",
    paragraphs: s => [
      "O monstro desaparece.", "Por alguns segundos, Vespera fica completamente silenciosa.",
      "Alana percebe que Roberto está machucado. Roberto percebe que Alana está tremendo.",
      "Nenhum dos dois fala.", "Então o Oráculo abre uma pequena janela de luz entre vocês.",
      "“Vocês começaram esta jornada tentando descobrir o que Vespera queria. Agora Vespera quer descobrir o que vocês querem um do outro.”"
    ],
    quote: s => s.trust >= 5 ? "“Talvez a nossa maior força seja não deixar o outro enfrentar nada sozinho.”" : "“A aventura mal começou. E já está difícil fingir que isso é apenas uma aventura.”",
    choices: [
      { id: "roberto-heart", actor: "roberto", label: "Roberto fala o que sente", hint: "Uma escolha sem espada, sem magia e sem volta.", target: "chapter4", effect: s => ({ affection: s.affection + 4, trust: s.trust + 2, flags: addUnique(s.flags, "declaracao-roberto"), memories: [...s.memories, "Roberto teve coragem de falar o que sentia."] }) },
      { id: "alana-heart", actor: "alana", label: "Alana fala o que sente", hint: "Deixar o coração escolher antes do destino.", target: "chapter4", effect: s => ({ affection: s.affection + 4, trust: s.trust + 2, flags: addUnique(s.flags, "declaracao-alana"), memories: [...s.memories, "Alana decidiu que algumas verdades não deveriam ser adiadas."] }) },
      { id: "together-heart", actor: "together", label: "Os dois ficam em silêncio, juntos", hint: "Às vezes não é preciso dizer nada.", target: "chapter4", effect: s => ({ affection: s.affection + 3, trust: s.trust + 3, memories: [...s.memories, "Vocês descobriram que o silêncio também podia ser uma escolha."] }) }
    ]
  },
  chapter4: {
    chapter: 4, chapterTitle: "ARCO IV — O CORAÇÃO DE VESPERA", title: "O mapa que escolhe os caminhos",
    location: "Biblioteca Infinita", mood: "Cada página pode mudar o futuro.",
    paragraphs: s => [
      "A Biblioteca Infinita possui livros que ainda não foram escritos.",
      "Um mapa aparece diante de vocês com três destinos: o Reino do Abismo, a Cidade dos Heróis e o Jardim Onde o Tempo Dorme.",
      "No centro existe uma anotação escrita à mão.",
      "“A partir daqui, suas decisões deixarão de mudar apenas o caminho. Elas começarão a mudar as pessoas.”",
      `O Oráculo já classificou vocês como: ${adaptiveProfile(s)}.`
    ],
    quote: () => "“Não existe caminho certo. Existe o caminho que vocês terão que sustentar depois.”",
    choices: [
      { id: "abyss", actor: "roberto", label: "Roberto escolhe o Reino do Abismo", hint: "Enfrentar o perigo antes que ele encontre vocês.", target: "end", ending: "sacrificio", effect: s => ({ courage: s.courage + 3, tension: s.tension + 2, memories: [...s.memories, "Roberto escolheu encarar o Abismo."] }) },
      { id: "heroes", actor: "alana", label: "Alana escolhe a Cidade dos Heróis", hint: "Buscar aliados antes da próxima guerra.", target: "end", ending: "alianca", effect: s => ({ curiosity: s.curiosity + 3, trust: s.trust + 2, memories: [...s.memories, "Alana abriu o caminho até a Cidade dos Heróis."] }) },
      { id: "garden", actor: "together", label: "Escolher o Jardim do Tempo", hint: "Tentar descobrir por que Vespera escolheu vocês.", target: "end", ending: "cartografia", effect: s => ({ curiosity: s.curiosity + 4, affection: s.affection + 2, memories: [...s.memories, "Vocês escolheram descobrir a verdade sobre o tempo."] }) }
    ]
  }
};

nodes.end = {
  chapter: 5, chapterTitle: "ARCO V — A PRIMEIRA VERDADE", title: "A história está apenas começando",
  location: "O Coração de Vespera", mood: "Uma porta para algo muito maior.",
  paragraphs: s => [
    "O mapa desaparece.", "As estrelas acima de vocês formam dois nomes: ROBERTO e ALANA.",
    "O Oráculo finalmente revela a verdade: a aventura inteira foi construída para observar como vocês tomariam decisões quando o mundo colocasse um contra o outro.",
    "Mas existe uma falha no plano.", "O Oráculo aprendeu a torcer por vocês.",
    `Perfil aprendido nesta primeira parte: ${adaptiveProfile(s)}.`,
    `Memórias importantes registradas: ${s.memories.length}.`,
    "E então uma nova porta aparece.", "Atrás dela existe uma cidade inteira em guerra."
  ],
  choices: [
    { id: "continue", actor: "together", label: "🚪 Continuar a aventura", hint: "A campanha continua a partir deste estado.", target: "portal", effect: s => ({ chapter: 6, memories: [...s.memories, "Vocês decidiram continuar. O Oráculo abriu um novo arco."] }) },
    { id: "final-love", actor: "together", label: "❤️ Escolher um final romântico por agora", hint: "Guardar esta noite antes da próxima aventura.", ending: "amor", effect: s => ({ affection: s.affection + 5 }) }
  ]
};

function HpBar({ name, hp, max, side }: { name: string; hp: number; max: number; side: "left" | "right" }) {
  const pct = clamp((hp / max) * 100, 0, 100);
  return <div className={`hp-card ${side}`}>
    <div className="hp-top"><strong>{name}</strong><span>{Math.round(hp)} / {max}</span></div>
    <div className="hp-track"><div className="hp-fill" style={{ width: `${pct}%` }} /></div>
    <div className="hp-percent">{Math.round(pct)}% ❤️</div>
  </div>;
}

const SCENE_ART: Record<string, { image: string; title: string; subtitle: string; gallery: string[] }> = {
  portal: { image: "/media/art/portal.svg", title: "A Porta Impossível", subtitle: "O primeiro chamado de Vespera.", gallery: ["/media/art/vespera-particles.gif", "/media/art/city.svg"] },
  flash: { image: "/media/art/city.svg", title: "Vespera", subtitle: "Uma cidade entre magia, neon e duas luas.", gallery: ["/media/gifs/flash.gif", "/media/art/vespera-particles.gif"] },
  spider: { image: "/media/art/spider.svg", title: "Distrito das Teias", subtitle: "A guerra das dimensões começou.", gallery: ["/media/gifs/aranha.gif", "/media/art/time-rift.gif"] },
  rift: { image: "/media/art/rift.svg", title: "A Ponte Celeste", subtitle: "Uma escolha que muda o peso da história.", gallery: ["/media/art/time-rift.gif", "/media/art/city.svg"] },
  boss: { image: "/media/art/boss.svg", title: "Devorador de Instantes", subtitle: "03:00. O tempo começou a morrer.", gallery: ["/media/videos/batalha-chefe-01.mp4", "/media/art/time-rift.gif"] },
  romance: { image: "/media/art/romance.svg", title: "Depois da Batalha", subtitle: "Quando o silêncio diz mais que qualquer magia.", gallery: ["/media/art/vespera-particles.gif", "/media/art/end.svg"] },
  library: { image: "/media/art/library.svg", title: "Biblioteca Infinita", subtitle: "Livros que ainda não foram escritos.", gallery: ["/media/art/library.svg", "/media/art/vespera-particles.gif"] },
  end: { image: "/media/art/end.svg", title: "O Coração de Vespera", subtitle: "Dois nomes escritos entre as estrelas.", gallery: ["/media/art/end.svg", "/media/art/portal.svg"] }
};

function mediaSrcForNode(nodeId: string, cinematic?: string) {
  if (nodeId === "city") return "flash";
  if (nodeId === "spider") return "spider";
  if (nodeId === "rift") return "rift";
  if (nodeId === "boss1") return "boss";
  if (nodeId === "romance") return "romance";
  if (nodeId === "chapter4") return "library";
  if (nodeId === "end") return "end";
  return cinematic || "portal";
}

function Media({ kind }: { kind?: string }) {
  if (!kind) return null;
  const files: Record<string, string> = {
    portal: "/media/videos/portal.mp4",
    flash: "/media/gifs/flash.gif",
    spider: "/media/gifs/aranha.gif",
    boss: "/media/videos/batalha-chefe-01.mp4"
  };
  const src = files[kind];
  const scene = SCENE_ART[kind] ?? SCENE_ART.portal;
  const isGif = src?.endsWith(".gif");
  const isVideo = src?.endsWith(".mp4");

  return <section className="cinematic cinematic-rich">
    <div className="cinematic-label"><Sparkles size={14} /> EVENTO CINEMÁTICO • {scene.title.toUpperCase()}</div>
    <div className="cinematic-stage">
      <img className="cinematic-poster" src={scene.image} alt={scene.title} />
      {src && (isGif
        ? <img className="cinematic-motion" src={src} alt={`Animação: ${scene.title}`} onError={(e) => { e.currentTarget.style.display = "none"; }} />
        : isVideo
          ? <video className="cinematic-motion" src={src} muted autoPlay loop playsInline onError={(e) => { e.currentTarget.style.display = "none"; }} />
          : null)}
      <div className="cinematic-overlay" />
      <div className="cinematic-caption">
        <span>{scene.title}</span>
        <small>{scene.subtitle}</small>
      </div>
    </div>
    <div className="cinematic-gallery">
      {scene.gallery.map((file, i) => file.endsWith(".mp4")
        ? <video key={file} src={file} muted autoPlay loop playsInline />
        : <img key={file} src={file} alt={`Memória visual ${i + 1}`} />)}
    </div>
  </section>;
}

function StoryGallery({ nodeId }: { nodeId: string }) {
  const key = mediaSrcForNode(nodeId);
  const scene = SCENE_ART[key] ?? SCENE_ART.portal;
  return <div className="story-gallery">
    <div className="gallery-title"><Sparkles size={15} /> FRAGMENTOS DA MEMÓRIA <span>{scene.title}</span></div>
    <div className="gallery-grid">
      <img src={scene.image} alt={scene.title} />
      {scene.gallery.map((file, i) => file.endsWith(".mp4")
        ? <video key={file} src={file} muted autoPlay loop playsInline />
        : <img key={file} src={file} alt={`Fragmento ${i + 1}`} />)}
    </div>
  </div>;
}

function CharacterPortrait({ who, build }: { who: "roberto" | "alana"; build: CharacterBuild }) {
  const portrait = who === "roberto" ? "/media/characters/roberto.svg" : "/media/characters/alana.svg";
  return <div className={`character-portrait ${who}`}>
    <img src={portrait} alt={`Retrato de ${who === "roberto" ? "Roberto" : "Alana"}`} />
    <div className="portrait-glow" />
    <div className="portrait-info">
      <span>{build.className}</span>
      <b>{build.outfit}</b>
      <small>{build.powers.slice(0, 3).join(" • ")}</small>
    </div>
  </div>;
}

function AppBackground({ children }: { children: React.ReactNode }) {
  return <>
    <MagicBackground />
    <div className="game-content">{children}</div>
  </>;
}

function Arsenal({ game, setGame, onClose }: { game: GameState; setGame: React.Dispatch<React.SetStateAction<GameState>>; onClose: () => void }) {
  const [who, setWho] = useState<"roberto" | "alana">("roberto");
  const key = who === "roberto" ? "robertoBuild" : "alanaBuild";
  const build = game[key];
  const name = who === "roberto" ? "Roberto" : "Alana";

  function update(patch: Partial<CharacterBuild>) {
    setGame(g => ({ ...g, [key]: { ...g[key], ...patch } }));
  }
  function chooseClass(c: string) {
    const power = CLASS_DATA[c].power;
    update({ className: c, powers: addUnique(build.powers, power) });
    setGame(g => ({ ...g, powers: addUnique(g.powers, power), memories: [...g.memories, `${name} escolheu a classe ${c} e despertou ${power}.`] }));
  }
  function choosePower(p: string) {
    update({ powers: addUnique(build.powers, p) });
    setGame(g => ({ ...g, powers: addUnique(g.powers, p), memories: [...g.memories, `${name} equipou o poder ${p}.`] }));
  }
  function chooseItem(i: string) {
    update({ items: addUnique(build.items, i) });
    setGame(g => ({ ...g, items: addUnique(g.items, i) }));
  }

  return <main className="vespera arsenal">
    <header className="hud">
      <div><div className="eyebrow">FORJA DE VESPERA</div><strong>PERSONALIZAÇÃO & PODERES</strong></div>
      <button className="secondary" onClick={onClose}><ArrowRight size={16}/> VOLTAR</button>
    </header>
    <section className="arsenal-head">
      <div className="eyebrow">O DESTINO PODE SER EQUIPADO</div>
      <h1>Escolham quem vocês serão.</h1>
      <p>As escolhas da campanha desbloqueiam novas roupas, classes, poderes e itens. O que vocês equiparem também altera os combates.</p>
      <div className="switcher">
        <button className={who === "roberto" ? "active" : ""} onClick={() => setWho("roberto")}>⚡ ROBERTO</button>
        <button className={who === "alana" ? "active" : ""} onClick={() => setWho("alana")}>🌙 ALANA</button>
      </div>
    </section>
    <section className="character-showcase">
      <CharacterPortrait who={who} build={build} />
      <div className="character-dossier">
        <div className="eyebrow">FICHA DO DESTINO</div>
        <h2>{name}</h2>
        <p>As mudanças abaixo são persistentes e acompanham o personagem durante a campanha.</p>
        <div className="dossier-stats">
          <span>❤️ Vínculo <b>{game.affection}</b></span>
          <span>🤝 Confiança <b>{game.trust}</b></span>
          <span>⚡ Coragem <b>{game.courage}</b></span>
          <span>🔮 Curiosidade <b>{game.curiosity}</b></span>
        </div>
        <div className="dossier-tags">
          <span>CLASSE • {build.className}</span>
          <span>TRAJE • {build.outfit}</span>
          <span>PODERES • {build.powers.length}</span>
          <span>ITENS • {build.items.length}</span>
        </div>
      </div>
    </section>
    <div className="arsenal-grid">
      <section className="arsenal-card"><h2>⚔️ Classe de luta</h2><div className="option-grid">
        {Object.entries(CLASS_DATA).map(([c,d]) => <button className={`build-option ${build.className === c ? "selected" : ""}`} key={c} onClick={() => chooseClass(c)}><b>{c}</b><small>{d.power} • {d.bonus}</small></button>)}
      </div></section>
      <section className="arsenal-card"><h2>👕 Roupas</h2><div className="option-grid">
        {OUTFITS.map(([o,d]) => <button className={`build-option ${build.outfit === o ? "selected" : ""}`} key={o} onClick={() => update({ outfit: o })}><b>{o}</b><small>{d}</small></button>)}
      </div></section>
      <section className="arsenal-card"><h2>✨ Poderes</h2><div className="option-grid">
        {build.unlockedPowers.map(p => <button className={`build-option ${build.powers.includes(p) ? "selected" : ""}`} key={p} onClick={() => choosePower(p)}><b>{p}</b><small>{build.powers.includes(p) ? "Equipado" : "Equipar"}</small></button>)}
      </div></section>
      <section className="arsenal-card"><h2>🔮 Itens mágicos</h2><div className="option-grid">
        {build.unlockedItems.map(i => <button className={`build-option ${build.items.includes(i) ? "selected" : ""}`} key={i} onClick={() => chooseItem(i)}><b>{i}</b><small>{build.items.includes(i) ? "No inventário" : "Adicionar ao inventário"}</small></button>)}
      </div></section>
    </div>
    <div className="loadout"><b>{name}</b> • {build.outfit} • {build.className}<span>✨ {build.powers.join(" • ")}</span><span>🔮 {build.items.join(" • ") || "sem itens"}</span></div>
  </main>;
}

export default function App() {
  const [game, setGame] = useState<GameState>(() => loadSave() ?? emptyGame);
  const node = nodes[game.nodeId] ?? nodes.portal;
  const [lastActor, setLastActor] = useState<Turn>(game.turn);

  useEffect(() => { saveGame(game); }, [game]);

  useEffect(() => {
    if (game.screen === "reading" && game.nodeId === "boss1" && game.bossMaxHp === 0) {
      setGame(s => ({ ...s, screen: "battle", bossHp: 10000, bossMaxHp: 10000, turn: "together" }));
    }
  }, [game.screen, game.nodeId, game.bossMaxHp]);

  const visibleChoices = useMemo(() => node.choices.filter(c => !c.show || c.show(game)), [node, game]);
  const memories = game.memories.slice(-8).reverse();

  function start() {
    setGame({ ...emptyGame, screen: "prologue", prologueStep: 0 });
  }

  function choose(c: Choice) {
    setLastActor(c.actor);
    let effect = c.effect(game);
    const activePowers = [...game.robertoBuild.powers, ...game.alanaBuild.powers];

    if (c.battle && activePowers.includes("Supervelocidade"))
      effect = { ...effect, bossHp: (effect.bossHp ?? game.bossHp) - 700 };
    if (c.battle && activePowers.includes("Fogo Arcano"))
      effect = { ...effect, bossHp: (effect.bossHp ?? game.bossHp) - 600 };
    if (c.battle && activePowers.includes("Teletransporte"))
      effect = { ...effect, robertoHp: Math.min(game.robertoMaxHp, (effect.robertoHp ?? game.robertoHp) + 80), alanaHp: Math.min(game.alanaMaxHp, (effect.alanaHp ?? game.alanaHp) + 80) };
    if (c.battle && activePowers.includes("Cura Lunar"))
      effect = { ...effect, robertoHp: Math.min(game.robertoMaxHp, (effect.robertoHp ?? game.robertoHp) + 160), alanaHp: Math.min(game.alanaMaxHp, (effect.alanaHp ?? game.alanaHp) + 160) };

    let next: GameState = { ...game, ...effect, history: [...game.history, c.id], turn: c.actor, paused: false };
    next.robertoHp = clamp(next.robertoHp, 0, next.robertoMaxHp);
    next.alanaHp = clamp(next.alanaHp, 0, next.alanaMaxHp);

    if (c.battle) {
      next.bossHp = clamp(next.bossHp, 0, next.bossMaxHp);
      if (next.bossHp <= 0) {
        next.nodeId = "romance";
        next.screen = "reading";
        next.bossMaxHp = 0;
        next.bossHp = 0;
      } else {
        const counter = c.actor === "roberto" ? 130 : c.actor === "alana" ? 110 : 80;
        next.robertoHp = clamp(next.robertoHp - counter, 0, next.robertoMaxHp);
        next.alanaHp = clamp(next.alanaHp - Math.round(counter * .7), 0, next.alanaMaxHp);
        next.screen = "battle";
      }
    } else if (c.target) {
      next.nodeId = c.target;
      next.chapter = nodes[c.target]?.chapter ?? next.chapter;
      next.screen = "reading";
      if (c.target === "boss1") {
        next.screen = "battle";
        next.bossHp = 10000;
        next.bossMaxHp = 10000;
      }
    }
    if (c.ending) {
      next.endingKey = c.ending;
      next.screen = "ending";
    }
    setGame(next);
  }

  function togglePause() { setGame(s => ({ ...s, paused: !s.paused })); }
  function newGame() {
    try { localStorage.removeItem(SAVE_KEY); } catch {}
    setGame({ ...emptyGame, screen: "prologue" });
  }

  if (game.screen === "arsenal") return <AppBackground><Arsenal game={game} setGame={setGame} onClose={() => setGame(g => ({ ...g, screen: g.arsenalOpenFrom === "title" ? "title" : g.arsenalOpenFrom === "prologue" ? "prologue" : "reading" }))} /></AppBackground>;

  if (game.screen === "title") return <AppBackground><main className="vespera">
    <section className="title-screen">
      <div className="title-orbit"><div className="orbit-dot" /></div>
      <div className="eyebrow">UMA AVENTURA PARA DOIS</div>
      <h1>O Oráculo<br/><em>de Vespera</em></h1>
      <p>Roberto & Alana</p>
      <div className="title-copy">Uma história viva. Duas pessoas. Milhares de consequências.</div>
      <button className="primary" onClick={start}><Sparkles size={18}/> NOVA CAMPANHA <ArrowRight size={18}/></button>
      <button className="secondary" onClick={() => setGame({ ...emptyGame, screen: "arsenal", arsenalOpenFrom: "title" })}><Swords size={16}/> CRIAR PERSONAGENS</button>
      {loadSave() && <button className="secondary" onClick={() => setGame(s => ({...s, screen: s.nodeId === "boss1" ? "battle" : "reading"}))}><Play size={16}/> CONTINUAR CAMPANHA</button>}
      <div className="feature-row"><span>❤️ Vida de ambos</span><span>⚔️ Chefes</span><span>🧠 Memória adaptativa</span><span>🎬 Cenas cinematográficas</span></div>
    </section>
  </main></AppBackground>;

  if (game.screen === "prologue") {
    const pages = [
      ["Antes de Vespera", "Vocês ainda não sabem, mas esta noite vai se tornar uma memória que o Oráculo jamais conseguirá apagar."],
      ["Duas escolhas", "Durante a campanha, algumas decisões serão de Roberto. Outras serão de Alana. E algumas só poderão ser tomadas pelos dois."],
      ["A regra", "Não existe resposta perfeita. Existe consequência. O jogo vai lembrar do que vocês fizeram, como fizeram e quem ficou ao lado de quem."]
    ];
    const [title, text] = pages[game.prologueStep];
    return <AppBackground><main className="vespera prologue"><div className="book">
      <BookOpen size={22}/><span>PRÓLOGO • {game.prologueStep + 1}/3</span>
      <h1>{title}</h1><p>{text}</p>
      <button className="primary" onClick={() => game.prologueStep < 2 ? setGame(s => ({...s, prologueStep: s.prologueStep + 1})) : setGame(s => ({...s, screen: "arsenal", arsenalOpenFrom: "prologue"}))}>{game.prologueStep < 2 ? "VIRAR A PÁGINA" : "CRIAR PERSONAGENS"} <ArrowRight size={18}/></button>
      {game.prologueStep === 2 && <button className="secondary" onClick={() => setGame(s => ({...s, screen: "reading", nodeId: "portal"}))}>COMEÇAR SEM PERSONALIZAR</button>}
    </div></main></AppBackground>;
  }

  if (game.screen === "ending") return <AppBackground><main className="vespera"><section className="ending">
    <div className="eyebrow">EVENTO CANÔNICO CONCLUÍDO</div>
    <h1>O Oráculo sorriu.</h1>
    <p>{consequenceText(game)}</p>
    <div className="ending-stats">
      <div>❤️ Amor <b>{game.affection}</b></div><div>🤝 Confiança <b>{game.trust}</b></div><div>⚡ Coragem <b>{game.courage}</b></div><div>🔮 Curiosidade <b>{game.curiosity}</b></div>
    </div>
    <h2>Memórias da campanha</h2>
    {memories.map((m, i) => <p className="memory" key={i}>✦ {m}</p>)}
    <button className="primary" onClick={() => setGame(s => ({...s, screen: "reading", nodeId: "chapter4"}))}>CONTINUAR NO MUNDO <ArrowRight size={18}/></button>
    <button className="secondary" onClick={newGame}><RotateCcw size={16}/> NOVA CAMPANHA</button>
  </section></main></AppBackground>;

  return <AppBackground><main className="vespera game-shell">
    <header className="hud">
      <div><div className="eyebrow">O ORÁCULO DE VESPERA</div><strong>CAPÍTULO {game.chapter}</strong></div>
      <div className="hud-actions">
        <button onClick={togglePause} aria-label="Pausar">{game.paused ? <Play size={17}/> : <Pause size={17}/>}</button>
        <button onClick={() => setGame(s => ({...s, screen: "arsenal", arsenalOpenFrom: s.screen}))} aria-label="Personagens"><Swords size={17}/></button>
        <button onClick={() => setGame(s => ({...s, muted: !s.muted}))}>{game.muted ? <VolumeX size={17}/> : <Volume2 size={17}/>}</button>
      </div>
    </header>
    <div className="party">
      <HpBar name="ROBERTO" hp={game.robertoHp} max={game.robertoMaxHp} side="left"/>
      <div className="heart-link">♥<small>{game.affection}</small></div>
      <HpBar name="ALANA" hp={game.alanaHp} max={game.alanaMaxHp} side="right"/>
    </div>
    <div className="loadout-bar">
      <span>⚔️ Roberto: <b>{game.robertoBuild.className}</b></span><span>👕 {game.robertoBuild.outfit}</span><span>✨ {game.robertoBuild.powers.join(", ")}</span>
      <span>⚔️ Alana: <b>{game.alanaBuild.className}</b></span><span>👕 {game.alanaBuild.outfit}</span><span>✨ {game.alanaBuild.powers.join(", ")}</span>
    </div>
    <div className="game-grid">
      <aside className="memory-panel">
        <div className="panel-title"><Brain size={16}/> MEMÓRIA DO ORÁCULO</div>
        <div className="trait">Perfil: <b>{adaptiveProfile(game)}</b></div>
        {memories.map((m, i) => <div className="memory" key={i}>{m}</div>)}
        <div className="meters"><span>❤️ {game.affection}</span><span>🤝 {game.trust}</span><span>⚡ {game.courage}</span><span>🔮 {game.curiosity}</span></div>
      </aside>
      <article className="story">
        <Media kind={mediaSrcForNode(game.nodeId, node.cinematic)} />
        <div className="chapter-label">{node.chapterTitle}</div>
        <h1>{node.title}</h1>
        <div className="location">✦ {node.location} • {node.mood}</div>
        {node.paragraphs(game).map((p, i) => <p key={i}>{p}</p>)}
        <StoryGallery nodeId={game.nodeId} />
        {node.quote && <blockquote>{node.quote(game)}</blockquote>}
        {game.screen === "battle" && <div className="boss-hud">
          <div className="boss-name"><Swords size={18}/> O DEVORADOR DE INSTANTES <span>{Math.max(0, Math.round(game.bossHp))} HP</span></div>
          <div className="boss-track"><div style={{width: `${clamp((game.bossHp/game.bossMaxHp)*100,0,100)}%`}}/></div>
        </div>}
        <div className="choice-heading">
          <span>DECISÃO</span>
          <small>{lastActor === "roberto" ? "Roberto decidiu" : lastActor === "alana" ? "Alana decidiu" : "Decisão conjunta"}</small>
        </div>
        <div className="choices">
          {visibleChoices.map(c => <button key={c.id} className={`choice ${c.actor}`} onClick={() => choose(c)}>
            <span className="choice-actor">{c.actor === "roberto" ? "ROBERTO" : c.actor === "alana" ? "ALANA" : "OS DOIS"}</span>
            <strong>{c.label}</strong><small>{c.hint}</small><ArrowRight size={17}/>
          </button>)}
        </div>
      </article>
    </div>
    {game.paused && <div className="pause-overlay"><div className="pause-card"><Pause size={24}/><h2>VESPERA EM PAUSA</h2><p>Conversem. Decidam juntos. O Oráculo espera.</p><button className="primary" onClick={togglePause}><Play size={17}/> CONTINUAR</button><button className="secondary" onClick={newGame}>RECOMEÇAR</button></div></div>}
  </main></AppBackground>;
}
