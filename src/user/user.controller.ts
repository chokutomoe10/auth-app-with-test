import { Controller, Get, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { Role } from './enum/role.enum';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { GetCurrentUserId } from 'src/common/decorators';

@Controller('user')
export class UserController {
    constructor(private userService:UserService) {}

    @Roles(Role.ADMIN)
    @UseGuards(RolesGuard)
    @Get()
    @HttpCode(HttpStatus.OK)
    async getAllUsers(@GetCurrentUserId() userId: number) {
        return this.userService.getAllUsers(userId);
    }
}
