# prisma-d1-test

Sample for using Prisma from Node.js with prisma-accelerate-workers-d1

https://github.com/SoraKumo001/prisma-accelerate-workers-d1

## Usage

Commands required before execution

```sh
yarn prisma:migrate
```

- .env

```env
# Address of installed Workers
DATABASE_URL=prisma://xxxxx.workers.dev?api_key=xxxxxx
# For Migration
DB_NAME=xxxx
```

- prisma/schema.prisma

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url       = env("DATABASE_URL")
  directUrl = "file:./dev.db"
}

model Role{
  id        String   @id @default(uuid())
  name      String   @unique
  users     User[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String   @default("User")
  posts     Post[]
  roles     Role[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Post {
  id          String     @id @default(uuid())
  published   Boolean    @default(false)
  title       String     @default("New Post")
  content     String     @default("")
  author      User?      @relation(fields: [authorId], references: [id])
  authorId    String?
  categories  Category[]
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  publishedAt DateTime   @default(now())
}

model Category {
  id        String   @id @default(uuid())
  name      String
  posts     Post[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

- src/index.ts

Running in node.js

```ts
import { PrismaClient } from "@prisma/client";

const formatNumber = (num: number) => {
  return num.toString().padStart(2, "0");
};

const main = async () => {
  const prisma = new PrismaClient();
  const roles = await prisma.role.count().then(async (count) => {
    if (!count) {
      return Promise.all(
        [
          {
            name: "ADMIN",
          },
          { name: "USER" },
        ].map((data) => {
          return prisma.role.create({
            data,
          });
        })
      );
    }
    return prisma.role.findMany();
  });

  if (roles === undefined) {
    throw new Error("roles is undefined");
  }
  const ROLES = Object.fromEntries(roles.map((v) => [v.name, v.id] as const));

  const users = await prisma.user.count().then(async (count) => {
    if (!count) {
      return Promise.all(
        [
          {
            name: "admin",
            email: "admin@example.com",
            roles: {
              connect: [
                {
                  id: ROLES["ADMIN"],
                },
                { id: ROLES["USER"] },
              ],
            },
          },
          {
            name: "example",
            email: "example@example.com",
            roles: { connect: [{ id: ROLES["USER"] }] },
          },
        ].map((data) => {
          return prisma.user.create({
            data,
          });
        })
      );
    }
    return prisma.user.findMany();
  });

  // add category
  const categories = await prisma.category.count().then(async (count) => {
    if (!count) {
      return Promise.all(
        Array(10)
          .fill(0)
          .map((_, i) => ({ name: `Category${formatNumber(i + 1)}` }))
          .map((data) =>
            prisma.category.create({
              data,
            })
          )
      );
    }
    return prisma.category.findMany();
  });

  // add post
  await prisma.post.count().then(async (count) => {
    if (!count) {
      for (let i = 0; i < 30; i++) {
        await prisma.post.create({
          data: {
            title: `Post${formatNumber(i + 1)}`,
            content: `Post${formatNumber(i + 1)} content`,
            authorId: users[1].id,
            published: i % 4 !== 0,
            categories: {
              connect: [
                { id: categories[i % 2].id },
                { id: categories[i % 10].id },
              ],
            },
          },
        });
      }
    }
  });

  console.log(
    JSON.stringify(
      await prisma.post.findMany({
        include: { author: true, categories: true },
      }),
      undefined,
      2
    )
  );
};
main();
```
