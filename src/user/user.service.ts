import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from './enum/role.enum';

@Injectable()
export class UserService {
    constructor(private prisma: PrismaService) {}

    async getAllUsers(userId: number) {
        const user = await this.prisma.user.findUnique({
            where: {
                id: userId,
            },
            select: {
                role: true,
            },
        });

        if (user.role === Role.ADMIN) {
            return this.prisma.user.findMany();
        }
    }
}
