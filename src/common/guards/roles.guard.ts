import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Role } from "src/user/enum/role.enum";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector:Reflector, private prisma: PrismaService) {}

    async canActivate(context: ExecutionContext) {
        const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredRoles) return true;

        const request = context.switchToHttp().getRequest();
        const userId = request.user.id;

        const user = await this.prisma.user.findUnique({
            where: {
                id: userId,
            },
            select: {
                role: true,
            },
        });

        return requiredRoles.some((role) => role === user.role);
    }
}