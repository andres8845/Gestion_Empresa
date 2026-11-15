// Productos de prueba mientras el backend no está listo.
// Tienen la misma forma que el modelo `Product` de Prisma y usan los
// mismos códigos que el seed de la base de datos (backend/prisma/seeds).
// Este archivo se borra cuando la pantalla se conecte a la API.

export type Producto = {
  id: number;
  code: string;
  name: string;
  categoryId: number;
  salePrice: number; // ISV incluido (RN-07)
  unitType: "unidad" | "libra";
  stock: number;
  minStock: number;
  isvRate: number;
  requiresAgeVerification: boolean;
  isActive: boolean;
  parentProductId: number | null; // si es paquete, el producto que descuenta stock
  unitsPerPackage: number;
};

export const productosMock: Producto[] = [
  { id: 1, code: "ARR-001", name: "Arroz blanco", categoryId: 1, salePrice: 18, unitType: "libra", stock: 25, minStock: 8, isvRate: 0, requiresAgeVerification: false, isActive: true, parentProductId: null, unitsPerPackage: 1 },
  { id: 2, code: "FRI-001", name: "Frijol rojo", categoryId: 1, salePrice: 20, unitType: "libra", stock: 18, minStock: 6, isvRate: 0, requiresAgeVerification: false, isActive: true, parentProductId: null, unitsPerPackage: 1 },
  { id: 3, code: "AZU-001", name: "Azúcar", categoryId: 1, salePrice: 15, unitType: "libra", stock: 30, minStock: 8, isvRate: 0, requiresAgeVerification: false, isActive: true, parentProductId: null, unitsPerPackage: 1 },
  { id: 4, code: "AGU-001", name: "Agua purificada 600 ml", categoryId: 2, salePrice: 8, unitType: "unidad", stock: 45, minStock: 12, isvRate: 15, requiresAgeVerification: false, isActive: true, parentProductId: null, unitsPerPackage: 1 },
  { id: 5, code: "REF-001", name: "Refresco cola 1.5 L", categoryId: 2, salePrice: 28, unitType: "unidad", stock: 20, minStock: 6, isvRate: 15, requiresAgeVerification: false, isActive: true, parentProductId: null, unitsPerPackage: 1 },
  { id: 6, code: "AGU-PACK-006", name: "Paquete de agua (6 unidades)", categoryId: 2, salePrice: 42, unitType: "unidad", stock: 0, minStock: 0, isvRate: 15, requiresAgeVerification: false, isActive: true, parentProductId: 4, unitsPerPackage: 6 },
  { id: 7, code: "TOM-001", name: "Tomate", categoryId: 3, salePrice: 18, unitType: "libra", stock: 12, minStock: 5, isvRate: 0, requiresAgeVerification: false, isActive: true, parentProductId: null, unitsPerPackage: 1 },
  { id: 8, code: "NAR-001", name: "Naranja", categoryId: 3, salePrice: 15, unitType: "libra", stock: 20, minStock: 5, isvRate: 0, requiresAgeVerification: false, isActive: true, parentProductId: null, unitsPerPackage: 1 },
  { id: 9, code: "DET-001", name: "Detergente 500 g", categoryId: 4, salePrice: 28, unitType: "unidad", stock: 15, minStock: 4, isvRate: 15, requiresAgeVerification: false, isActive: true, parentProductId: null, unitsPerPackage: 1 },
  { id: 10, code: "JAB-001", name: "Jabón de baño", categoryId: 5, salePrice: 12, unitType: "unidad", stock: 25, minStock: 6, isvRate: 15, requiresAgeVerification: false, isActive: true, parentProductId: null, unitsPerPackage: 1 },
  { id: 11, code: "CUA-001", name: "Cuaderno rayado", categoryId: 6, salePrice: 22, unitType: "unidad", stock: 18, minStock: 5, isvRate: 15, requiresAgeVerification: false, isActive: true, parentProductId: null, unitsPerPackage: 1 },
  { id: 12, code: "LAP-001", name: "Lapicero azul", categoryId: 6, salePrice: 5, unitType: "unidad", stock: 50, minStock: 10, isvRate: 15, requiresAgeVerification: false, isActive: true, parentProductId: null, unitsPerPackage: 1 },
  // Para probar la verificación de edad (RN-26) y el aviso de poco stock (RN-25).
  { id: 13, code: "CER-001", name: "Cerveza nacional 355 ml", categoryId: 2, salePrice: 30, unitType: "unidad", stock: 2, minStock: 12, isvRate: 18, requiresAgeVerification: true, isActive: true, parentProductId: null, unitsPerPackage: 1 },
  // Desactivado: no debe aparecer en cobro (RN-14).
  { id: 14, code: "VEN-001", name: "Ventilador de mesa (descontinuado)", categoryId: 7, salePrice: 650, unitType: "unidad", stock: 1, minStock: 0, isvRate: 15, requiresAgeVerification: false, isActive: false, parentProductId: null, unitsPerPackage: 1 },
];