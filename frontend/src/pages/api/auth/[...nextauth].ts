import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import axios from 'axios';

export default NextAuth({
  providers: [
      GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
                  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
                      }),
                          CredentialsProvider({
                                name: 'Credentials',
                                      credentials: {
                                              email: { label: 'Email', type: 'email' },
                                                      password: { label: 'Password', type: 'password' },
                                                            },
                                                                  async authorize(credentials) {
                                                                          try {
                                                                                    const res = await axios.post('http://localhost:5000/api/login', {
                                                                                                email: credentials?.email,
                                                                                                            password: credentials?.password,
                                                                                                                      });
                                                                                                                                return res.data.user ? { ...res.data.user, accessToken: res.data.token } : null;
                                                                                                                                        } catch (err) {
                                                                                                                                                  throw new Error('Invalid credentials');
                                                                                                                                                          }
                                                                                                                                                                },
                                                                                                                                                                    }),
                                                                                                                                                                      ],
                                                                                                                                                                        callbacks: {
                                                                                                                                                                            async jwt({ token, user }) {
                                                                                                                                                                                  if (user) {
                                                                                                                                                                                          token.user = user;
                                                                                                                                                                                                }
                                                                                                                                                                                                      return token;
                                                                                                                                                                                                          },
                                                                                                                                                                                                              async session({ session, token }) {
                                                                                                                                                                                                                    session.user = token.user;
                                                                                                                                                                                                                          return session;
                                                                                                                                                                                                                              },
                                                                                                                                                                                                                                },
                                                                                                                                                                                                                                  pages: {
                                                                                                                                                                                                                                      signIn: '/',
                                                                                                                                                                                                                                        },
                                                                                                                                                                                                                                        });