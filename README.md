# PixiSkia-App (TypeScript / Pixi.js / Skia)

## Обзор 🌟

Приложение для создания графики. Позволяет рисовать различные фигуры, добавлять изображения и сохранять результат в PDF-файл высокого качества. Использует современные технологии Pixi.js и Skia для быстрой и качественной работы с графикой.

### [Посмотреть демо](https://subbotinroman.github.io/PixiSkia-App/) 👈

<img alt="PixiSkia-App preview" src="public/img/preview-1.png">
<img alt="PixiSkia-App preview" src="public/img/preview-2.png">
<img alt="PixiSkia-App preview" src="public/img/preview-3.png">


---

## Стек технологий ⚙️

![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Pixi.js](https://img.shields.io/badge/pixi.js-orange.svg?style=for-the-badge)
![Skia](https://img.shields.io/badge/Skia-Canvas-blue.svg?style=for-the-badge)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)

---

## Возможности 🚀

- 🎨 Отображение графики через две системы (Pixi.js и Skia)
- 📐 Поддержка трансформаций (сдвиг, поворот, масштабирование)
- 🖼️ Отрисовка векторных фигур и изображений
- 🖱️ Взаимодействие с элементами через клики мышью
- 📄 Сохранение результата в PDF высокого качества
- 🔄 Переключение между разными наборами фигур
- ⚡ Быстрая работа благодаря Vite

---

## Как запустить локально

1. Клонируйте репозиторий:
```bash
git clone https://github.com/SubbotinRoman/PixiSkia-App.git
cd PixiSkia-App
```

2. Установите зависимости:
```bash
npm install
```

3. Запустите сервер разработки:
```bash
npm run dev
```

4. Откройте в браузере:
```
http://localhost:5173
```

## Использование

1. Интерфейс приложения содержит два canvas:
   - Левый canvas: отображение графики через Pixi.js
   - Правый canvas: отображение графики через Skia

2. Доступные действия:
   - Кнопка "Сгенерировать случайную линию / фигуру": добавляет новый случайный элемент
   - Кнопка "Экспорт в PNG": сохраняет все нарисованные фигуры в PDF-файл
   - Кнопка "Переключить контейнер": показывает другой набор готовых фигур

3. Интерактивность:
   - Клик по элементам
   - Обработка нажатий мыши

## Структура проекта

- `src/`
  - `main.ts` - основной файл приложения
  - `SkiaRenderer.ts` - обертка для отображения графики через Skia
  - `types.ts` - TypeScript типы и интерфейсы

## Требования

- Node.js 16+
- npm или yarn
