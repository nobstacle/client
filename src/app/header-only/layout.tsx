import { ReactQueryContextProvider } from "../../context/ReactQueryContextProvider";
import { ShortcutsProvider } from "../dashboard/ShortcutProvider";
import "../globals.css";

export default function HeaderOnlyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style={{ margin: 0, padding: 0, background: 'transparent' }}>
        <ReactQueryContextProvider>
          <ShortcutsProvider>
            {children}
          </ShortcutsProvider>
        </ReactQueryContextProvider>
      </body>
    </html>
  );
}