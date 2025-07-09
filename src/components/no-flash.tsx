"use client";

export const NoFlashScript = () => {
    const script = `
(function() {
  try {
    var theme = localStorage.getItem('sheetmark-theme');
    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
`;
    return <script dangerouslySetInnerHTML={{ __html: script }} />;
};
