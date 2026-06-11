import type { LifeItem } from '../../types';
import { cover, gallery } from '../../lib/cdn';

export const gameData: LifeItem[] = [
  {
    id: 'arknights',
    title: 'Arknights',
    description: 'More than a strategy tower defense game, it is a Terra shaped together by art, music, narrative, and worldbuilding. It keeps pushing me to think about ideals, reality, and creation itself.',
    tech: ['Strategy', 'Tower Defense', 'Mobile Game'],
    link: '#',
    imageUrl: cover('arknights-cover.png'),
    articleContent: `For me, Arknights is far more than a strategy tower defense mobile game. What truly draws me in is the way it builds a complex and brutal world through a cold, restrained, and highly designed visual and narrative language: the Infected, mobile cities, Catastrophes, national conflict, corporations, and organisations. None of these elements exists just to look cool. Together they support Terra's heavy and convincing order.

Part of why I love Arknights comes from its gameplay. Operator deployment, DP management, route judgement, skill timing, and stage mechanics make every battle feel like a dynamic puzzle. It does not rely on pure stat checking. Instead, it asks me to observe, infer, experiment, and eventually solve a stage in my own way. There is something deeply satisfying about failing, understanding the logic, and finally arriving at a stable clear.

But the memories it leaves me with come even more from its characters, music, art, and worldbuilding. Rhodes Island does not feel like a simple protagonist faction. It feels like a ship trying to preserve ideals inside a chaotic world. Many stories refuse easy answers. They do not package suffering as heroic slogans. Instead, they let me see complexity: some problems cannot be solved cleanly, and some sacrifices are not romantic.

What makes Arknights special to me is how completely it fuses strategy gameplay, visual design, musical taste, and alternate-world storytelling. What stays with me is not only a specific clear, but also the first time its art style caught my eye, the weight of its writing, and the moment a character's stance genuinely moved me. It feels like a world that has stayed with me for a long time, one that keeps making me think about design, narrative, and creation beyond the game itself.

I must defend.

I really want to visit the Black Forest Sea.`,
    galleryImages: [
      { src: gallery('arknights-screenshot-1.png') },
      { src: gallery('arknights-screenshot-2.png') },
    ],
  },
  {
    id: 'arknights-endfield',
    title: 'Arknights: Endfield',
    description: 'What excites me is not only the Arknights name, but the way it extends Terra into a wider and stranger frontier shaped by exploration, industry, and construction.',
    tech: ['3D RPG', 'Strategy', 'Action', 'Factory Building', 'Cross-platform'],
    link: '#',
    imageUrl: cover('endfield-cover.webp'),
    articleContent: `What attracts me most about Arknights: Endfield is not simply that it inherits the name Arknights. It is that it extends the mood of Terra into a space that feels broader, stranger, and much closer to a frontier narrative. The focus is no longer only Rhodes Island moving between mobile cities and the Infected question. The camera pushes outward to Talos-II, to Endfield Industries, and to a borderland that must be explored, built, and understood again from scratch.

Compared with Arknights, which leans toward stage design, routes, and skill timing in the form of strategy tower defense, Endfield feels like an attempt on another axis entirely: 3D environments, real-time combat, squad coordination, resource scheduling, and systems with an industrial-building flavour together create an experience of establishing order in an unknown world. That shift from tactical judgement to larger-scale planning is exactly what appeals to me. The player is not only winning a battle, but laying paths, organising production, and expanding footholds on an unfamiliar planet.

I also love its direction in art and setting. Arknights already carries a strong industrial sense, an apocalyptic atmosphere, and a restrained design order, while Endfield pushes that further toward science fiction and frontier themes: aircraft, facilities, wastelands, Originium protocols, industrial systems. All of these make me imagine a civilisation machine slowly starting up in a desolate world. It is not a bright and effortless future fantasy, but a forward movement full of pressure, cost, and uncertainty.

That is why what I look forward to is not only where the story goes or which characters appear, but whether it can truly make me feel how people establish a new foothold in a dangerous world through technology, organisation, and conviction.

Spring onion or green onion? I want both.`,
    galleryImages: [
      { src: gallery('endfield-screenshot-1.webp') },
    ],
  },
  {
    id: 'death-stranding',
    title: 'Death Stranding',
    description: 'It matters to me not only because it speaks about loneliness and connection, but because it makes me believe that even in a broken world, people can reconnect each other through small acts of delivery.',
    tech: ['Action', 'Open-world', 'Strand game', 'PS4/PS5'],
    link: '#',
    imageUrl: cover('death-stranding-cover.jpg'),
    articleContent: `It is hard for me to describe my experience with Death Stranding as simply “I finished a game.” What makes it special is not how thrilling the combat is, but how it turns walking, carrying, loneliness, and connection into something emotionally tangible. So often I was just carrying cargo across wastelands, climbing snowy mountains, and avoiding timefall, yet within that long and quiet road I could feel a strange weight: not the weight of the mission, but the meaning of placing something into another person's hands.

What remains in my memory are those moments of walking alone through a broken world, and also the sudden feeling of being helped when I encountered ladders, ropes, and bridges left behind by other players. Death Stranding made me remember that human connection does not always have to be grand. Sometimes it is simply someone paving a small section of road for whoever comes later. It matters to me because it makes me believe that even when the world is shattered, people can still rebuild connection through one small act of passing something on after another.`,
    galleryImages: [
      { src: gallery('death-stranding-screenshot-1.jpg') },
      { src: gallery('death-stranding-screenshot-2.jpg') },
    ],
  },
];

export const travelData: LifeItem[] = [
  {
    id: 'zhenjiang',
    title: 'Zhenjiang',
    description: 'An unexpectedly lovely old Jiangnan city.',
    tech: ['Travel', 'Stay'],
    link: '#',
    imageUrl: cover('zhenjiang-cover.jpg'),
    articleContent: `It hardly counts as tourism, to be honest, since I study here.

But Zhenjiang really did become an unexpected delight. It does not have the fame of Hangzhou or Suzhou, yet it carries a charm of its own.

Jinshan Temple, the romance of Xijindu, and the green waters around Jingkou all give the city a relaxed and warm atmosphere. Every time I walk through its streets and alleys, I feel as if time moves a little more slowly here. For me, Zhenjiang is a place full of memories and small surprises. Even if it is not a classic travel destination, it still holds a special place in my heart.`,
    galleryImages: [
      { src: gallery('zhenjiang-gallery-1.jpg') },
      { src: gallery('zhenjiang-gallery-2.jpg') },
      { src: gallery('zhenjiang-gallery-3.webp') },
      { src: gallery('zhenjiang-gallery-4.webp') },
      { src: gallery('zhenjiang-gallery-5.webp') },
    ],
  },
];

export const otherData: LifeItem[] = [
  {
    id: 'game-dev',
    title: 'Game Development & Design',
    description: 'Building the worlds in my head. I am still on the way, but I already enjoy the process deeply.',
    imageUrl: cover('game-dev-cover.webp'),
    tech: ['Programming', 'Design'],
    articleContent: `My path into game development did not begin with “I want to ship a complete game.” It began with worlds, characters, mechanics, and scenes that kept appearing in my head. What I have always loved is the possibility of turning imagination into an interactive experience: not only writing a setting down, and not only drawing an image, but letting a player truly step into that world and feel its rules, atmosphere, and emotion.

Right now I mainly use Godot, and I have also worked with Unity. What attracts me most about game development is that it brings together programming, design, art, narrative, and pacing all at once. While writing code, I think about how systems work. While designing mechanics, I think about how players understand and act. While building scenes, I think about the relationship between image, mood, and worldbuilding. The process is complicated, but that very complexity is also what makes it so fascinating to me.

Of course, development is not easy. Many ideas feel complete in my head, yet once they are implemented they run into all sorts of problems: mechanics that are not fun, code structures that become messy, assets that do not fit together, projects that grow too large, or simply the discovery that my current ability is not enough yet. But those problems have also slowly made me understand that game development is not about reaching the finish line in one breath. It is about breaking things down, experimenting, refactoring, and making choices until a vague fantasy becomes something people can actually experience.

I am still on the road, and I have not yet made the kind of mature work I want to make. But I already love the process. To me, game development is not only technical practice. It is also a form of expression. It gives me a way to create worlds of my own, and to turn what once existed only in my mind into something real through rules, visuals, and interaction.`,
    galleryImages: [
      { src: gallery('game-dev-gallery-1.png') },
    ],
  },
];

export const alsoPlayGames: string[] = [
  'Terraria',
  'Stardew Valley',
  'Slay the Spire 2',
  'Mindustry',
];

export const artPlaceholderText =
  'Art is a wonderful thing. I love music, painting, design, and film too, but when I look back, I still feel I have not written enough about them yet. Maybe I will return to this later.';
