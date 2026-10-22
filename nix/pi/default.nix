{ factory }:
{
  settingsFile = factory.biome.formatFile "settings.json" factory.pi.settingsFile;
}
