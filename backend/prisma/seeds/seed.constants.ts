export const SEED = {
  users: {
    admin: 'admin.demo',
    cashier: 'cajero.demo',
  },

  categories: {
    groceries: 'Abarrotes',
    beverages: 'Bebidas',
    produce: 'Frutas y verduras',
    cleaning: 'Limpieza',
    personalCare: 'Higiene personal',
    school: 'Útiles escolares',
  },

  products: {
    rice: 'ARR-001',
    beans: 'FRI-001',
    sugar: 'AZU-001',
    water: 'AGU-001',
    soda: 'REF-001',
    waterPackage: 'AGU-PACK-006',
    tomato: 'TOM-001',
    orange: 'NAR-001',
    detergent: 'DET-001',
    soap: 'JAB-001',
    notebook: 'CUA-001',
    pen: 'LAP-001',
  },

  customers: {
    frequent: 'DEMO - Cliente frecuente',
    occasional: 'DEMO - Cliente ocasional',
  },

  invoices: {
    cash: 'DEMO-2026-0001',
    card: 'DEMO-2026-0002',
    mixed: 'DEMO-2026-0003',
    credit: 'DEMO-2026-0004',
    voided: 'DEMO-2026-0005',
  },

  dates: {
    closedSession: new Date('2026-11-13T14:00:00.000Z'),
    closedAt: new Date('2026-11-13T23:00:00.000Z'),
    openSession: new Date('2026-11-14T14:00:00.000Z'),

    stockEntry: new Date('2026-11-13T13:00:00.000Z'),
    cashSale: new Date('2026-11-13T16:15:00.000Z'),
    cardSale: new Date('2026-11-13T17:30:00.000Z'),
    voidedSale: new Date('2026-11-13T18:00:00.000Z'),
    mixedSale: new Date('2026-11-14T15:20:00.000Z'),
    creditSale: new Date('2026-11-14T16:45:00.000Z'),
    creditPayment: new Date('2026-11-14T17:30:00.000Z'),
    adjustment: new Date('2026-11-14T18:00:00.000Z'),
    replenishment: new Date('2026-11-14T00:00:00.000Z'),
  },
};