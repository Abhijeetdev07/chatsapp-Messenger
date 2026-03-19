import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect root url to /chat. 
  // If the user is unauthenticated, the middleware will automatically redirect them to /login
  redirect('/chat');
}
