import { useEffect } from "react";
import { HashRouter, Route, Routes } from "react-router";
import { Layout } from "./Layout";
import { TodayScreen } from "../screens/TodayScreen";
import { BooksScreen } from "../screens/BooksScreen";
import { ChaptersScreen } from "../screens/ChaptersScreen";
import { ReaderScreen } from "../screens/ReaderScreen";
import { SearchScreen } from "../screens/SearchScreen";
import { FavoritesScreen } from "../screens/FavoritesScreen";
import { JournalScreen } from "../screens/JournalScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { NotInTauriScreen } from "../screens/NotInTauriScreen";
import { isTauri } from "../data/db";
import { useProgress } from "../stores/progressStore";
import { useSettings } from "../stores/settingsStore";

export default function App() {
  const refresh = useProgress((s) => s.refresh);
  const loadSettings = useSettings((s) => s.load);

  useEffect(() => {
    // Primero los ajustes (la hora de fin del día afecta a la racha y las misiones).
    if (isTauri()) void loadSettings().then(refresh);
  }, [loadSettings, refresh]);

  if (!isTauri()) return <NotInTauriScreen />;

  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<TodayScreen />} />
          <Route path="biblia" element={<BooksScreen />} />
          <Route path="biblia/buscar" element={<SearchScreen />} />
          <Route path="biblia/favoritos" element={<FavoritesScreen />} />
          <Route path="biblia/:code" element={<ChaptersScreen />} />
          <Route path="biblia/:code/:chapter" element={<ReaderScreen />} />
          <Route path="diario" element={<JournalScreen />} />
          <Route path="ajustes" element={<SettingsScreen />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
