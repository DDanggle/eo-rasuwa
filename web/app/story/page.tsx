import { redirect } from 'next/navigation';

// Page 모듈끼리 컴포넌트를 import하지 않고 canonical map story로 넘긴다.
export default function StoryPage() {
  redirect('/map#story');
}
