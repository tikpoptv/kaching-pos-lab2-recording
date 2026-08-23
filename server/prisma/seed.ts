import { Prisma } from "@prisma/client";
import { getPrisma } from "../src/prisma.js";

const products = [
  { code: "BEV-001", barcode: "8850000000011", name: "KMUTT Drinking Water 600 ml", price: "10.00" },
  { code: "BEV-002", barcode: "8850000000028", name: "Orange Juice 250 ml", price: "25.00" },
  { code: "SNK-001", barcode: "8850000000035", name: "Sea Salt Potato Chips", price: "35.00" },
  { code: "STN-001", barcode: "8850000000042", name: "A5 Grid Notebook", price: "55.00" },
];

async function main() {
  const prisma = getPrisma();
  for (const product of products) {
    await prisma.product.upsert({
      where: { code: product.code },
      update: { ...product, price: new Prisma.Decimal(product.price), active: true },
      create: { ...product, price: new Prisma.Decimal(product.price) },
    });
  }
  console.log(`Seeded ${products.length} Kaching products.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
