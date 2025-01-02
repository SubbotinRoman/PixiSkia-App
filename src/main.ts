import * as PIXI from 'pixi.js-legacy';
import { SkiaRendererImpl } from './SkiaRenderer';

// Инициализируем PIXI.js
const app = new PIXI.Application({
  width: 400,
  height: 300,
  backgroundColor: 0xFFFFFF,
  antialias: true,
  forceCanvas: true
});

// Делаем app глобально доступным для PDF экспорта
(window as any).app = app;

// Добавляем PIXI canvas на страницу
const pixiContainer = document.getElementById('pixi-container');
if (pixiContainer) {
  pixiContainer.appendChild(app.view as HTMLCanvasElement);
}

// Создаем основной контейнер
const mainContainer = new PIXI.Container();
app.stage.addChild(mainContainer);

// Загружаем текстуру для спрайтов
const texture = PIXI.Texture.from('https://pixijs.com/assets/bunny.png');

// Функция для создания случайной фигуры
function createRandomShape(): PIXI.DisplayObject {
  // С вероятностью 1/4 создаем спрайт
  if (Math.random() < 0.25) {
    const sprite = new PIXI.Sprite(texture);
    const x = Math.random() * 300;
    const y = Math.random() * 200;
    
    // Позиция
    sprite.position.set(x, y);
    
    // Поворот
    sprite.angle = Math.random() * 360;
    
    // Масштаб
    const scale = 0.5 + Math.random();
    sprite.scale.set(scale, scale);

    // Делаем спрайт интерактивным
    sprite.eventMode = 'static';
    
    // Обработчик события клика по спрайту
    sprite.on('pointerdown', () => {
      console.log('Sprite clicked:', {
        type: 'sprite',
        position: { x: sprite.position.x, y: sprite.position.y },
        angle: sprite.angle,
        scale: sprite.scale.x
      });
    });

    // Обработчик события отпускания спрайта
    sprite.on('pointerup', () => {
      console.log('Sprite released');
    });

    // Возвращаем готовую картинку для отображения
    return sprite;
  }

  // В остальных случаях создаем графику
  const graphics = new PIXI.Graphics();
  const color = Math.random() * 0xFFFFFF;
  const x = Math.random() * 300;
  const y = Math.random() * 200;

  // С вероятностью 1/3 создаем линию
  if (Math.random() < 0.33) {
    // Рисуем линию
    const endX = x + (Math.random() - 0.5) * 100;
    const endY = y + (Math.random() - 0.5) * 100;
    graphics.lineStyle(2 + Math.random() * 8, color);
    graphics.moveTo(0, 0);
    graphics.lineTo(endX - x, endY - y);
  } else {
    graphics.beginFill(color);
    
    if (Math.random() > 0.5) {
      // Рисуем прямоугольник
      const width = 20 + Math.random() * 50;
      const height = 20 + Math.random() * 50;
      graphics.drawRect(0, 0, width, height);
    } else {
      // Рисуем круг
      const radius = 10 + Math.random() * 30;
      graphics.drawCircle(0, 0, radius);
    }
    
    graphics.endFill();
  }
  
  // Добавляем случайные трансформации
  graphics.position.set(x, y);
  graphics.angle = Math.random() * 360;
  const scale = 0.5 + Math.random();
  graphics.scale.set(scale, scale);

  // Делаем фигуру интерактивной
  graphics.eventMode = 'static';
  
  // Что делать когда нажимаем на фигуру
  graphics.on('pointerdown', () => {
    // Выводим в консоль информацию о фигуре: её тип, где находится, как повёрнута и размер
    console.log('Shape clicked:', {
      type: graphics.geometry.graphicsData[0].shape instanceof PIXI.Rectangle ? 'rectangle' : 
            graphics.geometry.graphicsData[0].shape instanceof PIXI.Circle ? 'circle' : 'line',
      position: { x: graphics.position.x, y: graphics.position.y },
      angle: graphics.angle,
      scale: graphics.scale.x
    });
  });

  // Что делать когда отпускаем фигуру
  graphics.on('pointerup', () => {
    console.log('Shape released');
  });
  
  // Возвращаем созданную фигуру
  return graphics;
}

// Создаем несколько контейнеров для демонстрации
const containers: PIXI.Container[] = [];
let currentContainerIndex = 0;

// Создаем первый набор фигур: красный овал и синий прямоугольник
function createContainer1(): PIXI.Container {
  // Создаем контейнер для группировки фигур
  const container = new PIXI.Container();
  
  // Создаем красный овал и наклоняем его на 30 градусов
  const g1 = new PIXI.Graphics();
  g1.beginFill(0xff0000).drawEllipse(0, 0, 200, 100).endFill();
  g1.position.set(200, 100);
  g1.angle = 30;
  // Делаем овал кликабельным
  g1.eventMode = 'static';
  g1.on('pointerdown', () => console.log('g1 pointerdown!'));

  // Создаем синий прямоугольник, наклоняем и растягиваем его
  const g2 = new PIXI.Graphics();
  g2.beginFill(0x0000ff).drawRect(-50, -75, 100, 150).endFill();
  g2.position.set(120, 60);
  g2.angle = 15;
  g2.scale.set(1.5, 1.7);
  // Делаем прямоугольник кликабельным
  g2.eventMode = 'static';
  g2.on('pointerup', () => console.log('g2 pointerup!'));

  // Добавляем обе фигуры в контейнер
  container.addChild(g1, g2);
  return container;
}

// Создаем второй набор фигур: две пересекающиеся линии
function createContainer2(): PIXI.Container {
  // Создаем контейнер для группировки линий
  const container = new PIXI.Container();
  
  // Создаем белую линию и наклоняем её вниз
  const g3 = new PIXI.Graphics();
  g3.lineStyle(10, 0xffffff, 1)
    .moveTo(0, 0).lineTo(150, 100);
  g3.angle = -20;

  // Создаем желтую линию и наклоняем её вверх
  const g4 = new PIXI.Graphics();
  g4.lineStyle(10, 0xffff00, 1)
    .moveTo(0, 70).lineTo(150, -30);
  g4.angle = 20;

  // Создаем дополнительный контейнер для линий и смещаем его
  const subContainer = new PIXI.Container();
  subContainer.position.set(75, 50);
  // Группируем линии вместе
  subContainer.addChild(g3, g4);
  container.addChild(subContainer);
  
  return container;
}

// Создаем контейнеры
containers.push(createContainer1(), createContainer2());

// Функция для переключения контейнеров
function switchContainer() {
  // Удаляем текущий контейнер
  app.stage.removeChildren();
  
  // Переключаемся на следующий контейнер
  currentContainerIndex = (currentContainerIndex + 1) % containers.length;
  
  // Добавляем новый контейнер
  app.stage.addChild(containers[currentContainerIndex]);
}

// Добавляем обработчик для кнопки переключения контейнеров
const switchButton = document.getElementById('switch-container');
if (switchButton) {
  switchButton.addEventListener('click', switchContainer);
}

// Загружаем CanvasKit
const script = document.createElement('script');
script.src = 'https://unpkg.com/canvaskit-wasm@0.38.0/bin/canvaskit.js';
document.head.appendChild(script);

let skiaRenderer: SkiaRendererImpl;

script.onload = () => {
  // @ts-ignore
  globalThis.CanvasKitInit({
    locateFile: (file: string) => `https://unpkg.com/canvaskit-wasm@0.38.0/bin/${file}`,
  }).then((CanvasKit: any) => {
    console.log('CanvasKit loaded');

    // Создаем Skia renderer
    skiaRenderer = new SkiaRendererImpl(CanvasKit, 400, 300);

    // Добавляем Skia canvas на страницу
    const skiaContainer = document.getElementById('skia-container');
    if (skiaContainer) {
      skiaContainer.appendChild(skiaRenderer.canvas);
    }

    // Добавляем обработчик для кнопки добавления случайной фигуры
    const addRandomButton = document.getElementById('add-random-btn');
    if (addRandomButton) {
      addRandomButton.addEventListener('click', () => {
        const shape = createRandomShape();
        mainContainer.addChild(shape);
        
        // Обновляем оба рендерера
        app.renderer.render(mainContainer);
        skiaRenderer.render(mainContainer);
      });
    }

    // Добавляем обработчик для кнопки экспорта в PDF
    const exportButton = document.getElementById('export-pdf-btn');
    if (exportButton) {
      exportButton.addEventListener('click', async () => {
        try {
          // Обновляем рендереры перед экспортом
          app.renderer.render(mainContainer);
          skiaRenderer.render(mainContainer);
          
          const pdfData = await skiaRenderer.exportToPDF();
          const blob = new Blob([pdfData], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'scene.pdf';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (error) {
          console.error('Error exporting PDF:', error);
        }
      });
    }

    // Запускаем рендеринг
    app.ticker.add(() => {
      skiaRenderer.render(mainContainer);
    });
  }).catch(error => {
    console.error('Failed to load CanvasKit:', error);
  });
};
