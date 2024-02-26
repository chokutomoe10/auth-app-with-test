import { Test } from "@nestjs/testing";
import { AppModule } from "src/app.module";
import { PrismaService } from "src/prisma/prisma.service";
import { AuthService } from "src/auth/auth.service";
import { UserService } from "../../user.service";
import { decode } from 'jsonwebtoken';
import { faker } from "@faker-js/faker";

describe('User Int', () => {
    let prisma: PrismaService;
    let authService: AuthService;
    let userService: UserService;

    const firstName = faker.person.firstName();

    const user1 = {
        name: firstName,
        email: faker.internet.email({ firstName }),
        password: 'super-secret',
    };

    const user2 = () => {
        return {
            name: faker.person.firstName(),
            email: faker.internet.email(),
            password: 'secret-random',
        }
    };

    const userRegister = async () => {
        const user = user2();
        const tokens = await authService.register(user);
        return tokens;
    };
    
    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports:[AppModule],
        }).compile();

        prisma = moduleRef.get(PrismaService);
        authService = moduleRef.get(AuthService);
        userService = moduleRef.get(UserService);
    });
    
    describe('get all user', () => {
        beforeAll(async () => {
            await prisma.cleanDatabase();
        });

        it('should throw if role of the user is not admin', async () => {
            const tokens = await authService.register({
                name: user1.name,
                email: user1.email,
                password: user1.password,
            });

            const at = tokens.access_token;

            const decoded = decode(at);
            const userId = Number(decoded['id']);

            let getUser;
            try {
                getUser = await userService.getAllUsers(userId);
            } catch (error) {
                expect(error.status).toBe(403);
            }

            expect(getUser).toBeUndefined();
        });

        it('should get all user', async () => {
            await prisma.user.update({
                where: {
                    email: user1.email
                },
                data: {
                    role: 'admin'
                }
            });
            
            const promises: Array<Promise<any>> = [];
            const usersCount = 3;

            for (let i = 0; i<usersCount; i++) {
                promises.push(userRegister());
            }

            await Promise.all(promises);
            
            const tokens = await authService.login({
                email: user1.email,
                password: user1.password,
            });

            const at = tokens.access_token;

            const decoded = decode(at);
            const userId = Number(decoded['id']);

            const getUser = await userService.getAllUsers(userId);

            expect(getUser).toBeTruthy();
        });
    });
});