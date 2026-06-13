/**
 * Passage library for Endurance Arena.
 * Features original, high-quality educational passages across multiple categories.
 * Combine/shuffles paragraph blocks to construct 200, 500, or 1000 word sessions dynamically.
 */

export interface PassageBlock {
  id: string;
  text: string;
  wordCount: number;
}

export const PASSAGE_BLOCKS: Record<string, PassageBlock[]> = {
  Technology: [
    {
      id: 'tech_p1',
      text: 'Computational thinking has fundamentally reshaped modern society, turning abstract mathematical concepts into tools that power global communication and commerce. At the heart of this revolution is software engineering, the disciplined practice of designing, writing, and maintaining source code. From basic desktop operations to global cloud database servers, software platforms act as the nervous system of modern business, coordinating complex tasks in milliseconds.',
      wordCount: 66
    },
    {
      id: 'tech_p2',
      text: 'Hardware development has progressed in parallel, guided for decades by Moore\'s Law, which predicted that the density of transistors on microchips would double roughly every two years. Although physical limits of silicon are slowing this trend, new materials and architectural designs keep pushing boundaries. Quantum computing and optical processors promise to unlock new dimensions of speed, bypassing limitations of traditional transistors.',
      wordCount: 63
    },
    {
      id: 'tech_p3',
      text: 'Networking protocols form the foundational architecture of the modern Internet, enabling millions of disparate devices to communicate reliably. Using standard protocols like TCP/IP, information is split into packets, routed across global optical fiber cables, and reassembled at the destination. The resilience of this infrastructure lies in its decentralized design, allowing packets to dynamically discover alternative paths if primary servers fail.',
      wordCount: 63
    },
    {
      id: 'tech_p4',
      text: 'Cloud computing has democratized access to supercomputing infrastructure, allowing startups to scale applications globally with minimal upfront cost. Virtualization allows multiple logical operating systems to run on a single physical host, optimizing server utility. Modern edge computing extends this logic by processing telemetry data closer to the user, reducing latency for time-critical industrial processes.',
      wordCount: 57
    },
    {
      id: 'tech_p5',
      text: 'Cybersecurity remains a persistent challenge as digital systems grow more complex. Public key cryptography secures communication channels using mathematical keys, preventing unauthorized decryption. However, social engineering and Zero-day exploits expose vulnerabilities that code alone cannot patch. Maintaining robust defensive posture requires continuous updates, zero-trust network configurations, and comprehensive employee training programs.',
      wordCount: 57
    },
    {
      id: 'tech_p6',
      text: 'Ubiquitous computing is transforming physical spaces into interactive systems. Connected smart sensors monitor city infrastructure, environmental patterns, and residential utility usage, generating vast streams of data. The challenge lies in designing low-power wireless transceivers that transmit securely without battery exhaustion, requiring specialized microcontrollers and optimized edge algorithms.',
      wordCount: 49
    }
  ],
  AI: [
    {
      id: 'ai_p1',
      text: 'Artificial intelligence has shifted from academic speculation to a powerful driver of digital transformation. Deep learning, modeled loosely on biological neural pathways, enables machines to parse vast datasets and extract complex features. By adjusting connection weights across hidden network layers, algorithms learn to classify images, transcribe speech, and translate languages with human-like accuracy.',
      wordCount: 57
    },
    {
      id: 'ai_p2',
      text: 'Generative models use natural language processing to synthesize coherent text and create synthetic media. These networks analyze syntax and semantics to predict the probability of subsequent words, producing contextually relevant responses. However, artificial intelligence requires substantial computational infrastructure, driving demand for specialized tensor processing units and energy-efficient data center operations.',
      wordCount: 54
    },
    {
      id: 'ai_p3',
      text: 'Machine learning algorithms rely heavily on clean data pipelines to avoid training bias. If historical datasets contain systemic inequities, the trained models will replicate and scale these errors, leading to unfair credit scoring or recruiting practices. Mitigating this risk requires algorithmic transparency, dataset auditing, and multidisciplinary oversight to align intelligence models with ethical norms.',
      wordCount: 57
    },
    {
      id: 'ai_p4',
      text: 'Reinforcement learning mimics behavioral psychology by rewarding computer agents for taking optimal paths. Through continuous trial and error, algorithms learn to play strategy games, control industrial robotic limbs, and navigate autonomous vehicles. The challenge lies in designing reward functions that prevent unintended shortcuts, where agents optimize score metrics without solving the target problem.',
      wordCount: 57
    },
    {
      id: 'ai_p5',
      text: 'Computer vision technologies parse spatial arrays of pixels to identify objects and track movement. Convolutional neural networks extract geometric features like edges and textures, compiling them into recognizable patterns. This capability underpins autonomous highway navigation, industrial assembly inspection, and medical diagnostic scanning, where software assists radiologists in identifying microscopic tissue anomalies.',
      wordCount: 54
    },
    {
      id: 'ai_p6',
      text: 'Natural language understanding represents a major milestone in human-computer interaction. Transformers utilize attention mechanisms to evaluate relationships between words regardless of distance in a sentence, capturing context far better than previous architectures. This technology enables intelligent virtual assistants to parse idioms, summarize documentation, and write functional code snippets.',
      wordCount: 53
    }
  ],
  Science: [
    {
      id: 'sci_p1',
      text: 'Scientific discovery relies on empirical methodology, verifying theories through systematic observation, controlled experimentation, and rigorous data analysis. The scientific process demands reproducibility, ensuring that independent research teams using identical protocols produce equivalent results. This cycle of hypothesis, testing, and peer review keeps refining our understanding of physical laws.',
      wordCount: 51
    },
    {
      id: 'sci_p2',
      text: 'Genetics has advanced rapidly since the mapping of the human genome, revealing the chemical instructions that govern cellular growth. CRISPR gene-editing tools allow molecular biologists to make precise alterations to DNA sequences, offering cures for hereditary conditions and raising agricultural resilience. However, genetic modification requires careful safety controls to prevent unintended biosphere consequences.',
      wordCount: 56
    },
    {
      id: 'sci_p3',
      text: 'Thermodynamics governs energy transformations, dictating how work is done in engines, chemical reactions, and biological systems. The laws of thermodynamics state that energy cannot be created or destroyed, only altered in form, and that entropy naturally increases in closed environments. Understanding these physical limits guides engineers in designing efficient solar panels, cooling systems, and chemical batteries.',
      wordCount: 59
    },
    {
      id: 'sci_p4',
      text: 'Geology tracks Earth\'s history through rock layers, recording tectonic movements and climatic shifts over millions of years. Plate tectonics explains how crust plates drift on the mantle, building mountain ranges and triggering seismic tremors. Analyzing geological core samples reveals prehistoric carbon levels, helping climatologists predict environmental responses to current greenhouse emissions.',
      wordCount: 55
    },
    {
      id: 'sci_p5',
      text: 'Quantum mechanics operates at atomic scales, showing that matter displays characteristics of both particles and waves. Concepts like superposition and entanglement challenge intuitive logic, describing states where subatomic particles exist in multiple probabilities simultaneously until measured. This theoretical foundation enables modern semiconductor technology, medical MRI scanning, and quantum cryptography.',
      wordCount: 52
    },
    {
      id: 'sci_p6',
      text: 'Ecological science evaluates the delicate networks linking living organisms to their chemical environments. Nutrient cycles, such as the carbon and nitrogen loops, maintain soil vitality and atmospheric balance. Human industrial output disrupts these natural loops, requiring conservation biologists to design restoration strategies that protect biodiversity hotspots and stabilize fragile local biomes.',
      wordCount: 54
    }
  ],
  Space: [
    {
      id: 'space_p1',
      text: 'Astrophysics explores the origin and mechanics of the cosmos, from subatomic reactions inside stellar cores to the expansion of cosmic boundaries. Observatories like James Webb use infrared sensors to look back in time, capturing light from the universe\'s earliest galaxies. By analyzing spectral signatures of distant stars, astronomers determine their chemical composition and orbital velocity.',
      wordCount: 57
    },
    {
      id: 'space_p2',
      text: 'Mars exploration represents the frontier of planetary science, with robotic rovers analyzing soil chemistry and hunting for biosignatures of ancient water. Setting up human colonies on Mars requires solving severe engineering problems, including radiation shielding, oxygen generation, and closed-loop recycling systems. The thin carbon dioxide atmosphere offers little insulation, exposing surface equipment to extreme temperatures.',
      wordCount: 57
    },
    {
      id: 'space_p3',
      text: 'Orbital mechanics dictates the trajectories of satellites, requiring precise velocity adjustments to maintain geosynchronous positions. Rockets must reach escape velocity to break free from Earth\'s gravitational pull, consuming massive amounts of liquid propellant. Reusable rocket boosters have reduced launch costs, opening space exploration to commercial logistics, orbital research platforms, and global communications networks.',
      wordCount: 56
    },
    {
      id: 'space_p4',
      text: 'Exoplanet research has identified thousands of worlds orbiting distant stars, some within habitable zones where liquid water could theoretically exist. Scientists analyze the dimming of starlight as planets pass in front of their host stars, deducing atmospheric elements. Detecting signatures of water vapor, methane, and oxygen provides tantalizing clues in the search for extraterrestrial life.',
      wordCount: 55
    },
    {
      id: 'space_p5',
      text: 'Deep space propulsion concepts aim to bypass chemical limitations for interstellar travel. Ion engines accelerate xenon atoms using electrical fields, delivering continuous low-thrust propulsion over long durations. Solar sails harness light pressure from lasers or starlight, eliminating fuel weight entirely. These technologies could allow unmanned probes to reach neighboring stellar systems within decades.',
      wordCount: 56
    },
    {
      id: 'space_p6',
      text: 'Stellar evolution describes the life cycles of stars, determined by their starting mass. Average stars expand into red giants before collapsing into white dwarfs, while massive stars end in cataclysmic supernova explosions, forging heavy elements. The remaining cores collapse into neutron stars or black holes, gravitational anomalies where escape velocity exceeds speed of light.',
      wordCount: 55
    }
  ],
  History: [
    {
      id: 'hist_p1',
      text: 'The Silk Road served as a crucial network of trade routes connecting East Asia with the Mediterranean basin, facilitating commerce, migration, and cultural synthesis. Caravans transported silk, spices, and glassware across high mountain passes, but the most lasting impact was the transmission of ideas. Technologies like paper manufacturing, gunpowder, and metallurgy spread along these routes, transforming medieval Europe.',
      wordCount: 60
    },
    {
      id: 'hist_p2',
      text: 'The Industrial Revolution marked a major turning point, substituting hand production with steam engines and automated machinery. Originating in Great Britain, this transition reshaped demographics, pulling families from farms into rapidly growing factory cities. The resulting economic shifts drove infrastructure development, leading to railway networks and steamships that accelerated global trade loops.',
      wordCount: 55
    },
    {
      id: 'hist_p3',
      text: 'The printing press invented by Johannes Gutenberg in the fifteenth century democratized access to literacy and accelerated scientific discovery. Before moveable type, scribes copied manuscripts by hand, limiting access to academic research. The mass production of books allowed ideas to spread rapidly, challenging traditional authorities and paving the way for the scientific revolution and enlightenment.',
      wordCount: 58
    },
    {
      id: 'hist_p4',
      text: 'The decline of the Roman Empire resulted from complex factors, including internal corruption, monetary inflation, and external pressure from migrating tribes. The division of the empire into eastern and western halves weakened administrative control, and the western capital eventually fell. However, Roman laws, architecture, and languages persisted, shaping the legal and administrative foundations of Europe.',
      wordCount: 57
    },
    {
      id: 'hist_p5',
      text: 'Maritime exploration in the fifteenth century connected isolated hemispheres, creating global trade networks. Navigators utilized advanced compasses and sturdy caravels to cross open oceans, charting routes around Africa and discovering the Americas. The resulting trade loops exchanged plants, animals, and technologies, but also introduced diseases that devastated indigenous populations.',
      wordCount: 52
    },
    {
      id: 'hist_p6',
      text: 'The scientific revolution of the seventeenth century challenged traditional cosmologies, replacing dogma with empirical observation. Nicolaus Copernicus proposed a heliocentric model, positioning the Sun at the center of the solar system, while Isaac Newton formulated the laws of motion and gravitation. This era established the scientific method as the primary framework for understanding the physical world.',
      wordCount: 57
    }
  ],
  Programming: [
    {
      id: 'prog_p1',
      text: 'Software developers write algorithms to solve complex tasks, translating logic into instructions that CPU chips can execute. Programming paradigms dictate how code is structured, with object-oriented paradigms organizing logic around data entities, and functional paradigms avoiding mutable state. Choosing the right design pattern improves software maintainability and prevents resource leaks.',
      wordCount: 54
    },
    {
      id: 'prog_p2',
      text: 'Memory management is a key aspect of systems programming, where developers allocate and free raw memory bytes. High-level languages utilize automated garbage collection to sweep unused allocations, preventing memory leaks. In contrast, systems languages like C and Rust require manual or compile-time allocation tracking, ensuring maximum speed at the cost of coding complexity.',
      wordCount: 56
    },
    {
      id: 'prog_p3',
      text: 'Asynchronous programming enables application servers to handle thousands of connections concurrently without blocking threads. Using event loops and non-blocking I/O operations, servers process incoming requests while waiting for slow database transactions to complete. This architecture maximizes throughput for web APIs, real-time communications platforms, and microservices.',
      wordCount: 48
    },
    {
      id: 'prog_p4',
      text: 'Database indexing significantly improves query speeds by creating optimized search trees on table columns. Without indexes, databases must perform full table scans to locate rows, creating bottlenecks as data grows. Developers balance indexing utility against write performance, since indexes must be updated during every insert, update, and delete operation.',
      wordCount: 51
    },
    {
      id: 'prog_p5',
      text: 'Concurrency patterns prevent data races when multiple threads access shared memory buffers simultaneously. Mutex locks restrict access to one thread at a time, ensuring data consistency but creating potential bottlenecks if threads block indefinitely. Modern languages implement channel-based message passing to coordinate execution threads safely, avoiding shared state entirely.',
      wordCount: 51
    },
    {
      id: 'prog_p6',
      text: 'Compiler design involves converting high-level syntax into efficient machine language instructions. The compiler parses source code into an abstract syntax tree, applies semantic checks, and optimizes operations before generating executable code. Understanding this pipeline helps developers write code that aligns with compiler optimizations, maximizing execution speeds.',
      wordCount: 49
    }
  ],
  Business: [
    {
      id: 'bus_p1',
      text: 'Strategic management guides companies through changing market conditions, aiming to build sustainable competitive advantages. Executives evaluate internal assets and external hazards to allocate resources, manage risks, and enter new markets. Successful businesses balance short-term profitability with long-term research and development, ensuring relevance as technological cycles disrupt traditional models.',
      wordCount: 53
    },
    {
      id: 'bus_p2',
      text: 'Supply chain management coordinates the flow of raw materials, inventory, and finished goods from producers to retail shelves. Implementing just-in-time inventory systems minimizes holding costs, but exposes companies to delays if transit networks fail. Resilient supply chains utilize diverse suppliers, real-time telemetry systems, and digital tracking databases to mitigate regional disruptions.',
      wordCount: 53
    },
    {
      id: 'bus_p3',
      text: 'Financial markets channel capital from investors into active businesses, enabling infrastructure expansion and product research. Stock exchanges evaluate equity value based on quarterly earnings reports, macro-economic patterns, and industry outlooks. Corporate finance officers manage capital structure, balancing debt and equity to minimize the cost of capital while funding expansion plans.',
      wordCount: 54
    },
    {
      id: 'bus_p4',
      text: 'Consumer behavior analytics uses data streams to map buying habits and optimize advertising campaigns. By tracking web navigation paths, transaction histories, and demographics, marketing teams segment audiences and tailor advertisements. Ethical data management requires protecting user privacy through consent frameworks and database encryption, building brand trust in digital markets.',
      wordCount: 52
    },
    {
      id: 'bus_p5',
      text: 'Corporate governance establishes rules, practices, and relationships that dictate how companies are managed and directed. Boards of directors represent shareholder interests, overseeing executive decisions, financial audits, and environmental compliance. Transparent governance prevents conflicts of interest, protects minority shareholders, and builds credibility with global investors.',
      wordCount: 47
    },
    {
      id: 'bus_p6',
      text: 'Venture capital drives technological innovation by funding early-stage startups that present high growth potential and high risks. Capital firms provide financial resources, mentorship, and industry connections in exchange for equity ownership. Startups utilize these funds to scale product engineering, hire technical talent, and establish market share before reaching profitability.',
      wordCount: 52
    }
  ]
};

/**
 * Builds a passage of a target length by combining and shuffling paragraph blocks.
 * @param category The chosen category (or 'Random')
 * @param targetLength The chosen target length in words (200, 500, 1000)
 * @param excludedIds Optional array of block IDs to exclude (anti-repetition)
 */
export function generateEndurancePassage(
  category: string,
  targetLength: number,
  excludedIds: string[] = []
): { text: string; idsUsed: string[]; category: string } {
  let selectedCategory = category;
  if (selectedCategory === 'Random' || !PASSAGE_BLOCKS[selectedCategory]) {
    const categories = Object.keys(PASSAGE_BLOCKS);
    selectedCategory = categories[Math.floor(Math.random() * categories.length)];
  }

  const allBlocks = PASSAGE_BLOCKS[selectedCategory] || [];
  
  // Filter out recently used block IDs first, if possible.
  // If too many are excluded, fall back to allow all to avoid empty passages.
  let blocks = allBlocks.filter(b => !excludedIds.includes(b.id));
  if (blocks.length === 0) {
    blocks = allBlocks;
  }

  // Shuffle available blocks
  const shuffled = [...blocks].sort(() => Math.random() - 0.5);

  let currentTextParts: string[] = [];
  let currentWordCount = 0;
  const idsUsed: string[] = [];

  // Loop to reach near the target length. If we run out of unique blocks,
  // we reuse them from the category pool (shuffled again) to satisfy target length.
  let pool = [...shuffled];
  while (currentWordCount < targetLength) {
    if (pool.length === 0) {
      pool = [...allBlocks].sort(() => Math.random() - 0.5);
    }
    const block = pool.pop();
    if (!block) break;

    currentTextParts.push(block.text);
    currentWordCount += block.wordCount;
    if (!idsUsed.includes(block.id)) {
      idsUsed.push(block.id);
    }
  }

  // Trim or adjust words to be precisely/closely matching the requested word count limit.
  const joinedText = currentTextParts.join(' ');
  const words = joinedText.split(/\s+/);
  
  // If the joined text is longer than targetLength, slice it to be exact.
  // This guarantees accurate test sizes.
  if (words.length > targetLength) {
    return {
      text: words.slice(0, targetLength).join(' '),
      idsUsed,
      category: selectedCategory
    };
  }

  return {
    text: joinedText,
    idsUsed,
    category: selectedCategory
  };
}
