import WebGLImageProcessor from '@/components/WebGLImageProcessor';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-24">
      <h1 className="text-3xl font-bold mb-8 text-center">
        WebGL Shader Effects and GIF Export Demo
      </h1>
      
      <WebGLImageProcessor />
      
      <footer className="mt-16 text-center text-gray-500 text-sm">
        <p>
          Built with WebGL and Canvas technologies. 
          Apply shader effects and export as GIFs, all in your browser!
        </p>
      </footer>
    </main>
  );
}
