'use client';
import MapApp from '../map/page';

// 스토리(방법·근거 서사)를 별도 URL 로. 지도 컴포넌트를 재사용하되 서사를 처음부터 연다.
export default function StoryPage() {
  return <MapApp storyDefault />;
}
