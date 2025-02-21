'use client';

import dynamic from 'next/dynamic';

const ImageEditorComponent = dynamic(() => import('@/components/ImageEditorComponent'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">
        Loading editor...
      </div>
    </div>
  )
});

export default function Page() {
  return <ImageEditorComponent />;
}
