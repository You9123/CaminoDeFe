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
import { AchievementsScreen } from "../screens/AchievementsScreen";
import { StatsScreen } from "../screens/StatsScreen";
import { MapScreen } from "../screens/MapScreen";
import { MissionsScreen } from "../screens/MissionsScreen";
import { TimelineScreen } from "../screens/TimelineScreen";
import { CollectiblesScreen } from "../screens/CollectiblesScreen";
import { JournalGate } from "../components/PinLock";
import { NotInTauriScreen } from "../screens/NotInTauriScreen";
import { isTauri } from "../data/db";
import { useProgress } from "../stores/progressStore";
import { useSettings } from "../stores/settingsStore";
import { useUpdates } from "../stores/updateStore";
import { useVoices } from "../stores/voicesStore";

export default function App() {
  const refresh = useProgress((s) => s.refresh);
  const checkAchievements = useProgress((s) => s.checkAchievements);
  const loadSettings = useSettings((s) => s.load);

  useEffect(() => {
    // Primero los ajustes (la hora de fin del día afecta a la racha y las misiones).
    // Después se revisan los logros: al actualizar a la V2 se desbloquean los que ya se cumplían.
    if (isTauri())
      void loadSettings()
        .then(refresh)
        .then(checkAchievements)
        // Voces naturales descargadas (Piper, ADR-0011): el modo escuchar las usa si están.
        .then(() => useVoices.getState().refresh())
        // Al final, sin apuro: ¿hay una versión nueva? (ADR-0010)
        .then(() => useUpdates.getState().init())
        .catch((e: unknown) => console.error(e));
  }, [loadSettings, refresh, checkAchievements]);

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
          <Route
            path="diario"
            element={
              <JournalGate>
                <JournalScreen />
              </JournalGate>
            }
          />
          <Route path="mapa" element={<MapScreen />} />
          <Route path="misiones" element={<MissionsScreen />} />
          <Route path="linea-temporal" element={<TimelineScreen />} />
          <Route path="logros" element={<AchievementsScreen />} />
          <Route path="logros/coleccionables" element={<CollectiblesScreen />} />
          <Route path="estadisticas" element={<StatsScreen />} />
          <Route path="ajustes" element={<SettingsScreen />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
