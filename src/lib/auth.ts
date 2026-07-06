import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";

async function findUserByGoogleId(googleId: string) {
  const [user] = await getDb()
    .select()
    .from(users)
    .where(eq(users.googleId, googleId))
    .limit(1);
  return user ?? null;
}

async function upsertGoogleUser(profile: {
  sub: string;
  email?: string | null;
  name?: string | null;
  picture?: string | null;
}) {
  const existing = await findUserByGoogleId(profile.sub);

  if (!existing) {
    const id = nanoid(12);
    await getDb().insert(users).values({
      id,
      googleId: profile.sub,
      email: profile.email ?? "",
      name: profile.name ?? profile.email ?? "User",
      image: profile.picture ?? null,
    });
    return findUserByGoogleId(profile.sub);
  }

  await getDb()
    .update(users)
    .set({
      name: profile.name ?? existing.name,
      email: profile.email ?? existing.email,
      image: profile.picture ?? existing.image,
    })
    .where(eq(users.id, existing.id));

  return findUserByGoogleId(profile.sub);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/",
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google" || !profile?.sub) {
        return false;
      }

      await upsertGoogleUser({
        sub: profile.sub,
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
      });
      return true;
    },
    async jwt({ token, account, profile }) {
      if (account?.provider === "google" && profile?.sub) {
        const user = await upsertGoogleUser({
          sub: profile.sub,
          email: profile.email,
          name: profile.name,
          picture: profile.picture,
        });
        if (user) {
          token.userId = user.id;
          token.name = user.name;
          token.email = user.email;
          token.picture = user.image;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId;
      }
      if (token.name) {
        session.user.name = token.name as string;
      }
      if (token.email) {
        session.user.email = token.email as string;
      }
      if (token.picture) {
        session.user.image = token.picture as string;
      }
      return session;
    },
  },
});

export async function getSessionUserId() {
  const session = await auth();
  return session?.user?.id ?? null;
}
