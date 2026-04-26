Confide

What is confide?
Confide is an app with a component of a AI companion that is judgemental and that it is there to accompany along the way and that helps follow your diet, could be a recomended by a nutrionist or the AI can generate a diet plan if necessary. The app also lets you log.

Stack 
- Nextjs - Full Stack framework in javacript and react that let you have both front and backend apps 
- Supabase - because it handles auth, postgreSQL in a seameless way 
- Antrophic API
- Vercel - helps deployment in real time in seamless just with a github repo.


## Key decisions

### Auth
Why Supabase Auth. Why two Supabase clients (browser vs server).

### Database
Why PostgreSQL via Supabase. Why I designed these 5 tables. Why RLS.
Because is easy and RLS because give more security

### Onboarding
Why conversational instead of a single form. Why step-by-step.
Because makes the app more iterative

### Multi-select for dietary restrictions
Why an array instead of separate fields.
Because the are some many option to choose from to the point that the user could choose 1 or more 

## What I learned

- React state, hooks, controlled inputs
- TypeScript types and keyof
- SQL table creation, constraints, triggers
- Client vs server components in Next.js
- Supabase auth, database queries, RLS
- How APIs are structured

## What I'd do differently
Nothing for now 
