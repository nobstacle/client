import { SocketContextProvider } from "../../context/SocketContextProvider";

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex h-screen w-screen items-center justify-center bg-white">
      <SocketContextProvider>{children}</SocketContextProvider>
    </main>
  );
}

export default Layout;
