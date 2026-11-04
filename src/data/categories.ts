import { Category } from '../types';

export interface CategoryInfo {
  id: Category;
  name: string;
  shortName: string;
  description: string;
  iconName: string;
}

export const CATEGORIES: CategoryInfo[] = [
  {
    id: 'NOTEBOOKS',
    name: 'NOTEBOOKS',
    shortName: 'Notebooks',
    description: 'Equipos corporativos, consumo y gamers de primeras marcas (Lenovo, ASUS, HP, Dell).',
    iconName: 'Laptop',
  },
  {
    id: 'HARDWARE',
    name: 'HARDWARE',
    shortName: 'Hardware',
    description: 'Microprocesadores, motherboards, placas de video, memorias RAM, fuentes y gabinetes.',
    iconName: 'Cpu',
  },
  {
    id: 'ALMACENAMIENTO',
    name: 'ALMACENAMIENTO',
    shortName: 'Almacenamiento',
    description: 'Discos SSD NVMe, SATA 2.5", discos externos y memorias flash.',
    iconName: 'HardDrive',
  },
  {
    id: 'PERIFERICOS: (MOUSE, TECLADOS, PARLANTES, ETC)',
    name: 'PERIFERICOS: (MOUSE, TECLADOS, PARLANTES, ETC)',
    shortName: 'Periféricos',
    description: 'Mouses ópticos/gamers, teclados mecánicos, combos de oficina y parlantes.',
    iconName: 'Keyboard',
  },
  {
    id: 'AURICULARES (IN EAR/VINCHA/BLUETOOTH/GAMER)',
    name: 'AURICULARES (IN EAR/VINCHA/BLUETOOTH/GAMER)',
    shortName: 'Auriculares',
    description: 'In Ear, vincha, bluetooth TWS y headsets gamers con cancelación de ruido.',
    iconName: 'Headphones',
  },
  {
    id: 'CONSOLAS Y GAMERS',
    name: 'CONSOLAS Y GAMERS',
    shortName: 'Consolas & Gamers',
    description: 'Consolas portátiles retro (R36S, R39S), joysticks, mandos y accesorios gaming.',
    iconName: 'Gamepad2',
  },
  {
    id: 'CONECTIVIDAD',
    name: 'CONECTIVIDAD',
    shortName: 'Conectividad',
    description: 'Routers Wi-Fi 6, placas de red USB/PCIe, switches ethernet y repetidores.',
    iconName: 'Wifi',
  },
  {
    id: 'SEGURIDAD',
    name: 'SEGURIDAD',
    shortName: 'Seguridad',
    description: 'Cámaras IP Wi-Fi, domos de exterior, DVRs, fuentes y balunes.',
    iconName: 'ShieldCheck',
  },
  {
    id: 'INSUMOS',
    name: 'INSUMOS',
    shortName: 'Insumos',
    description: 'Pastas térmicas, aire comprimido, alcohol isopropílico, toners y rollos térmicos.',
    iconName: 'Layers',
  },
  {
    id: 'SMARTWACHES',
    name: 'SMARTWACHES',
    shortName: 'Smartwatches',
    description: 'Relojes inteligentes, pulseras fit, mallas de silicona y cargadores magnéticos.',
    iconName: 'Watch',
  },
  {
    id: 'STREAMING',
    name: 'STREAMING',
    shortName: 'Streaming',
    description: 'Micrófonos USB condensadores, aros de luz LED, capturadoras de video y brazos articulados.',
    iconName: 'Radio',
  },
  {
    id: 'CELULARES / PS5',
    name: 'CELULARES / PS5',
    shortName: 'Celulares / PS5',
    description: 'Accesorios, repuestos y periféricos para celulares y PlayStation 5.',
    iconName: 'Smartphone',
  },
  {
    id: 'CARGADORES NB',
    name: 'CARGADORES NB',
    shortName: 'Cargadores NB',
    description: 'Cargadores universales y específicos con diversas fichas (HP, Lenovo, Dell, Asus, Tipo C).',
    iconName: 'BatteryCharging',
  },
  {
    id: 'CARGADOR Y CABLE CELULAR TIPO C',
    name: 'CARGADOR Y CABLE CELULAR TIPO C',
    shortName: 'Cargador/Cable Tipo C',
    description: 'Cargadores rápidos PD / QC 3.0, cables reforzados Type-C a Type-C y USB a Type-C.',
    iconName: 'Zap',
  },
  {
    id: 'CARGADOR Y CABLE CELULAR IPHONE',
    name: 'CARGADOR Y CABLE CELULAR IPHONE',
    shortName: 'Cargador/Cable iPhone',
    description: 'Cargadores 20W PD, cables Lightning a USB y Lightning a Type-C certificados.',
    iconName: 'Smartphone',
  },
  {
    id: 'CARGADOR Y CABLE CELULAR V8',
    name: 'CARGADOR Y CABLE CELULAR V8',
    shortName: 'Cargador/Cable V8',
    description: 'Cables y cargadores Micro USB V8 de alta velocidad y máxima durabilidad.',
    iconName: 'Cable',
  },
  {
    id: 'CABEZALES, CARGADORES AUTO Y TRANSMISORES DE AUTO',
    name: 'CABEZALES, CARGADORES AUTO Y TRANSMISORES DE AUTO',
    shortName: 'Auto y Transmisores',
    description: 'Cargadores para encendedor 12V/24V de carga rápida y transmisores FM Bluetooth.',
    iconName: 'Car',
  },
  {
    id: 'ACCESORIOS, ADAPTADORES Y CABLES',
    name: 'ACCESORIOS, ADAPTADORES Y CABLES',
    shortName: 'Accesorios & Cables',
    description: 'Cables HDMI 2.1, DisplayPort, adaptadores VGA, hubs USB-C, patch cords y OTG.',
    iconName: 'Share2',
  },
  {
    id: 'POLIRUBRO / HOGAR',
    name: 'POLIRUBRO / HOGAR',
    shortName: 'Polirubro / Hogar',
    description: 'Pilas recargables, multímetros digitales, linternas tácticas y artículos del hogar.',
    iconName: 'Boxes',
  },
  {
    id: 'VARIOS',
    name: 'VARIOS',
    shortName: 'Varios',
    description: 'Pads mouse gamer XL, soportes para monitor, organizadores de cables y bases refrigerantes.',
    iconName: 'Grid',
  },
];
