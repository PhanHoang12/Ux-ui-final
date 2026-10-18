import { PrismaClient, RoleCode } from "../src/generated/prisma";

export async function seedRoles(db: PrismaClient) {
  const roles = [
    { code: RoleCode.USER, name: "Người dùng" },
    { code: RoleCode.ORGANIZER, name: "Ban tổ chức" },
    { code: RoleCode.COLLECTOR, name: "Nhân sự thu gom" },
    { code: RoleCode.ADMIN, name: "Quản trị viên" },
  ];
  await db.$transaction(async (tx) => {
    for (const role of roles) {
      await tx.role.upsert({
        where: { code: role.code },
        create: role,
        update: role,
      });
    }
  });
}
