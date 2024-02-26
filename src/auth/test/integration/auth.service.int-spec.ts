import { Test } from "@nestjs/testing";
import { AppModule } from "src/app.module";
import { PrismaService } from "src/prisma/prisma.service";
import { AuthService } from "../../auth.service";
import { Tokens } from "../../types";
import { decode } from "jsonwebtoken";
import { faker } from '@faker-js/faker';

describe('Auth Int', () => {
    let prisma: PrismaService;
    let authService: AuthService;

    const firstName = faker.person.firstName();

    const user = {
        name: firstName,
        email: faker.internet.email({ firstName }),
        password: 'super-secret',
    };

    const userRegister = async () => {
        const tokens = await authService.register(user);
        return tokens;
    };

    const userLogin = async () => {
        const tokens = await authService.login({
            email: user.email,
            password: user.password,
        });
        return tokens;
    }
    
    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports:[AppModule],
        }).compile();

        prisma = moduleRef.get(PrismaService);
        authService = moduleRef.get(AuthService);
        // await prisma.cleanDatabase();
    });

    describe('register', () => {
        beforeAll(async () => {
            await prisma.cleanDatabase();
        });

        it('should signup', async () => {
            const tokens = await userRegister();

            expect(tokens.access_token).toBeTruthy();
            expect(tokens.refresh_token).toBeTruthy();
        });

        it('should throw on duplicate user register', async () => {
            let tokens: Tokens | undefined;
            try {
                tokens = await userRegister();
            } catch (error) {
                expect(error.status).toBe(403);
            }

            expect(tokens).toBeUndefined();
        });
    });

    describe('login', () => {
        beforeAll(async () => {
            await prisma.cleanDatabase();
        });

        it('should throw if no existing user', async () => {
            let tokens: Tokens | undefined;
            try {
                tokens = await userLogin();
            } catch (error) {
                expect(error.status).toBe(403);
            }

            expect(tokens).toBeUndefined();
        });

        it('should login', async () => {
            await userRegister();

            const tokens = await userLogin();

            expect(tokens.access_token).toBeTruthy();
            expect(tokens.refresh_token).toBeTruthy();
        });

        it('should throw if password incorrect', async () => {
            let tokens: Tokens | undefined;
            try {
                tokens = await authService.login({
                    email: user.email,
                    password: user.password + 'a',
                });
            } catch (error) {
                expect(error.status).toBe(403);
            }

            expect(tokens).toBeUndefined();
        });
    });

    describe('logout', () => {
        beforeAll(async () => {
            await prisma.cleanDatabase();
        });

        it('should pass if call to non existent user', async () => {
            const result = await authService.logout(3);
            expect(result).toBeDefined();
        });

        it('should logout', async () => {
            await userRegister();

            let userFromDb: any ;

            userFromDb = await prisma.user.findFirst({
                where: {
                    email: user.email,
                },
            });
            expect(userFromDb?.hashRt).toBeTruthy();

            await authService.logout(userFromDb!.id);

            userFromDb = await prisma.user.findFirst({
                where: {
                    email: user.email,
                },
            });

            expect(userFromDb?.hashRt).toBeFalsy();
        });
    });

    describe('refresh', () => {
        beforeAll(async () => {
            await prisma.cleanDatabase();
        });

        it('should throw if no existing user', async () => {
            let tokens: Tokens | undefined;
            try {
                tokens = await authService.refreshTokens(1, '');
            } catch (error) {
                expect(error.status).toBe(403);
            }
        });

        it('should throw if user logged out', async () => {
            const userAuth = await userRegister();

            const rt = userAuth.refresh_token;

            const decoded = decode(rt);
            const userId = Number(decoded['id']);

            let tokens: Tokens | undefined;
            try {
                tokens = await authService.refreshTokens(userId, rt + 'a');
            } catch (error) {
                expect(error.status).toBe(403);
            }

            expect(tokens).toBeUndefined();
        });

        it('should throw if refresh token incorrect', async () => {
            await prisma.cleanDatabase();

            const userAuth = await userRegister();

            const rt = userAuth.refresh_token;

            const decoded = decode(rt);
            const userId = Number(decoded['id']);

            let tokens: Tokens | undefined;
            try {
                tokens = await authService.refreshTokens(userId, rt + 'a');
            } catch (error) {
                expect(error.status).toBe(403);
            }

            expect(tokens).toBeUndefined();
        });

        it('should refresh tokens', async () => {
            await prisma.cleanDatabase();

            const userAuth = await userRegister();

            const rt = userAuth.refresh_token;
            const at = userAuth.access_token;

            const decoded = decode(rt);
            const userId = Number(decoded['id']);
            
            await new Promise((resolve, reject) => {
                setTimeout(() => {
                    resolve(true);
                }, 1000);
            });

            const tokens = await authService.refreshTokens(userId, rt);
            expect(tokens).toBeDefined();

            expect(tokens.access_token).not.toBe(at);
            expect(tokens.refresh_token).not.toBe(rt);
        });
    });
});