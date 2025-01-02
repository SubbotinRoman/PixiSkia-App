/**
 * SkiaRenderer.ts
 * Основной класс для рендеринга PIXI контейнеров с помощью Skia
 * Обеспечивает отрисовку графики и спрайтов с поддержкой трансформаций
 */

// Импортируем необходимые зависимости
import * as PIXI from 'pixi.js-legacy'; // Библиотека PIXI.js для 2D графики
import jsPDF from 'jspdf'; // Библиотека для создания PDF документов
import type { SkiaRenderer } from './types'; // Интерфейс рендерера
import type { Canvas, CanvasKit, Surface, Path, Paint, PaintStyle } from 'canvaskit-wasm'; // Типы из Skia

/**
 * Основной класс рендерера, реализующий интерфейс SkiaRenderer
 * Отвечает за отрисовку PIXI контейнеров с помощью Skia
 */
export class SkiaRendererImpl implements SkiaRenderer {
  private surface: Surface; // Поверхность для рисования Skia
  private skCanvas: Canvas; // Основной объект Skia для работы с графикой
  readonly canvas: HTMLCanvasElement; // HTML элемент canvas
  private paint: Paint; // Объект для настройки стилей рисования
  private container: PIXI.Container; // Текущий PIXI контейнер

  // Кэш для хранения загруженных изображений
  private imageCache: Map<string, any> = new Map();

  /**
   * Конструктор рендерера
   * @param canvasKit - Основной объект библиотеки Skia для рисования
   * @param width - Ширина canvas
   * @param height - Высота canvas
   * @param container - PIXI контейнер для рендеринга
   */
  constructor(
    private canvasKit: CanvasKit,
    private width: number,
    private height: number,
    container: PIXI.Container
  ) {
    // Создаем HTML элемент canvas для Skia
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    
    // Инициализируем поверхность Skia
    this.surface = this.canvasKit.MakeCanvasSurface(this.canvas);
    if (!this.surface) {
      throw new Error('Could not make surface');
    }
    this.skCanvas = this.surface.getCanvas();
    
    // Создаем объект Paint для настройки стилей
    this.paint = new this.canvasKit.Paint();

    // Сохраняем ссылку на контейнер
    this.container = container;

    // Настраиваем обработку событий указателя
    this.canvas.style.touchAction = 'none';
    this.setupPointerEvents();
  }

  /**
   * Основной метод рендеринга
   * @param container - PIXI контейнер для отрисовки
   */
  render(container: PIXI.Container): void {
    // Обновляем ссылку на текущий контейнер
    this.container = container;
    
    // Очищаем canvas белым цветом перед рендерингом
    this.skCanvas.save();
    this.skCanvas.drawColor(this.canvasKit.WHITE);
    this.skCanvas.restore();
    
    // Рендерим контейнер
    this.renderContainer(container).then(() => {
      // Показываем все нарисованное на экране
      this.surface.flush();
    });
  }

  /**
   * Рендеринг отдельного контейнера и его дочерних элементов
   * @param container - PIXI контейнер
   */
  private async renderContainer(container: PIXI.Container): Promise<void> {
    for (const child of container.children) {
      if (child instanceof PIXI.Graphics) {
        // Рендерим графические примитивы (линии, круги, прямоугольники)
        this.renderGraphics(child);
      } else if (child instanceof PIXI.Sprite) {
        // Рендерим спрайты
        await this.renderSprite(child);
      } else if (child instanceof PIXI.Container) {
        // Рисуем содержимое контейнера
        await this.renderContainer(child);
      }
    }
  }

  /**
   * Рендеринг графических примитивов
   * @param graphics - PIXI.Graphics объект
   */
  private renderGraphics(graphics: PIXI.Graphics): void {
    graphics.geometry.graphicsData.forEach(data => {
      // Обработка линий
      if (data.lineStyle.visible) {
        const path = new this.canvasKit.Path();
        
        // Получаем данные о положении фигуры
        const transform = graphics.transform.worldTransform;
        
        // Обрабатываем точки для построения пути
        if (data.points && data.points.length >= 4) {
          // Устанавливаем начальную точку
          const startX = transform.tx + data.points[0];
          const startY = transform.ty + data.points[1];
          path.moveTo(startX, startY);
          
          // Добавляем остальные точки
          for (let i = 2; i < data.points.length; i += 2) {
            const x = transform.tx + data.points[i];
            const y = transform.ty + data.points[i + 1];
            path.lineTo(x, y);
          }
          
          // Настраиваем стиль линии
          this.paint.setStyle(this.canvasKit.PaintStyle.Stroke);
          this.paint.setColor(this.convertColor(data.lineStyle.color));
          this.paint.setStrokeWidth(data.lineStyle.width);
          
          // Если есть поворот, применяем его
          if (graphics.angle !== 0) {
            this.skCanvas.save();
            // Находим центр линии
            const bounds = graphics.getBounds();
            const centerX = bounds.x + bounds.width / 2;
            const centerY = bounds.y + bounds.height / 2;
            this.skCanvas.rotate(graphics.angle * Math.PI / 180, centerX, centerY);
          }
          
          // Рисуем линию
          this.skCanvas.drawPath(path, this.paint);
          
          // Возвращаем рисунок в исходное положение после поворота
          this.skCanvas.restore();
          // Очищаем временные данные фигуры из памяти
          path.delete();
        }
      }
      
      // Обработка прямоугольников
      if (data.shape instanceof PIXI.Rectangle) {
        // Получаем данные о положении фигуры
        const transform = graphics.transform.worldTransform;

        // Узнаем как фигура повернута, растянута и где находится
        const x = transform.tx + data.shape.x;
        const y = transform.ty + data.shape.y;
        const width = data.shape.width * transform.a;
        const height = data.shape.height * transform.d;

        // Создаем путь с учетом трансформации
        if (graphics.angle !== 0) {
          // Если есть поворот, сохраняем текущее состояние рисунка
          this.skCanvas.save();
          
          // Находим точку вокруг которой будем поворачивать фигуру
          const centerX = x + width/2;
          const centerY = y + height/2;
          
          // Поворачиваем вокруг центра фигуры
          this.skCanvas.rotate(graphics.angle * Math.PI / 180, centerX, centerY);
          
          // Рисуем прямоугольник
          const path = new this.canvasKit.Path();
          // Задаем координаты углов прямоугольника: левый верхний и правый нижний
          path.addRect([x, y, x + width, y + height]);
          
          // Если нужно закрасить фигуру
          if (data.fillStyle.visible) {
            // Устанавливаем режим заливки
            this.paint.setStyle(this.canvasKit.PaintStyle.Fill);
            // Задаем цвет заливки
            this.paint.setColor(this.convertColor(data.fillStyle.color));
            // Закрашиваем фигуру выбранным цветом
            this.skCanvas.drawPath(path, this.paint);
          }
          
          // Возвращаем рисунок в исходное положение после поворота
          this.skCanvas.restore();
          // Очищаем временные данные фигуры из памяти
          path.delete();
        } else {
          // Рисуем прямоугольник без поворота
          const path = new this.canvasKit.Path();
          // Задаем координаты углов прямоугольника: левый верхний и правый нижний
          path.addRect([x, y, x + width, y + height]);
          
          // Если нужно закрасить фигуру
          if (data.fillStyle.visible) {
            // Устанавливаем режим заливки
            this.paint.setStyle(this.canvasKit.PaintStyle.Fill);
            // Задаем цвет заливки
            this.paint.setColor(this.convertColor(data.fillStyle.color));
            // Закрашиваем фигуру выбранным цветом
            this.skCanvas.drawPath(path, this.paint);
          }
          // Очищаем временные данные фигуры из памяти
          path.delete();
        }

      } else if (data.shape instanceof PIXI.Circle) {
        // Рисуем круг
        const path = new this.canvasKit.Path();
        
        // Получаем данные о положении фигуры
        const transform = graphics.transform.worldTransform;
        let x = transform.tx + data.shape.x;
        let y = transform.ty + data.shape.y;
        const radius = data.shape.radius * Math.abs(transform.a); // Используем абсолютное значение для радиуса

        // Создаем путь с учетом трансформации
        if (graphics.angle !== 0) {
          // Если есть поворот, сохраняем текущее состояние рисунка
          this.skCanvas.save();
          
          // Поворачиваем вокруг центра круга
          this.skCanvas.rotate(graphics.angle * Math.PI / 180, x, y);
          
          // Рисуем круг
          path.addCircle(x, y, radius);
          
          // Если нужно закрасить фигуру
          if (data.fillStyle.visible) {
            // Устанавливаем режим заливки
            this.paint.setStyle(this.canvasKit.PaintStyle.Fill);
            // Задаем цвет заливки
            this.paint.setColor(this.convertColor(data.fillStyle.color));
            // Закрашиваем фигуру выбранным цветом
            this.skCanvas.drawPath(path, this.paint);
          }
          
          // Возвращаем рисунок в исходное положение после поворота
          this.skCanvas.restore();
        } else {
          // Без поворота рисуем напрямую
          path.addCircle(x, y, radius);
          
          // Если нужно закрасить фигуру
          if (data.fillStyle.visible) {
            // Устанавливаем режим заливки
            this.paint.setStyle(this.canvasKit.PaintStyle.Fill);
            // Задаем цвет заливки
            this.paint.setColor(this.convertColor(data.fillStyle.color));
            // Закрашиваем фигуру выбранным цветом
            this.skCanvas.drawPath(path, this.paint);
          }
        }

        // Очищаем временные данные фигуры из памяти
        path.delete();
      }
    });
  }

  /**
   * Рендеринг спрайтов
   * @param sprite - PIXI.Sprite объект
   */
  private async renderSprite(sprite: PIXI.Sprite): Promise<void> {
    // Проверяем есть ли у картинки адрес файла
    if (!sprite.texture.baseTexture.resource.url) {
      console.warn('Sprite has no image URL');
      return;
    }

    try {
      // Загружаем или получаем из кэша изображение
      let image = this.imageCache.get(sprite.texture.baseTexture.resource.url);
      if (!image) {
        image = await this.loadImage(sprite.texture.baseTexture.resource.url);
        this.imageCache.set(sprite.texture.baseTexture.resource.url, image);
      }

      this.skCanvas.save();

      // Создаем Paint с настройками прозрачности и tint
      const paint = new this.canvasKit.Paint();
      paint.setAlphaf(sprite.worldAlpha);

      // Применяем tint если он отличается от белого
      if (sprite.tint !== 0xFFFFFF) {
        const tintR = ((sprite.tint >> 16) & 0xFF) / 255;
        const tintG = ((sprite.tint >> 8) & 0xFF) / 255;
        const tintB = (sprite.tint & 0xFF) / 255;
        
        // Настраиваем цвета и прозрачность картинки
        const colorFilter = this.canvasKit.ColorFilter.MakeMatrix([
          tintR, 0, 0, 0, 0,    // Красный цвет
          0, tintG, 0, 0, 0,    // Зеленый цвет
          0, 0, tintB, 0, 0,    // Синий цвет
          0, 0, 0, sprite.worldAlpha, 0,  // Прозрачность
        ]);
        // Применяем настройки цвета к картинке
        paint.setColorFilter(colorFilter);
      }
      
      // Получаем трансформации
      const transform = sprite.transform.worldTransform;
      let x = transform.tx;
      let y = transform.ty;

      // Создаем прямоугольники исходного и целевого размера
      const srcRect = this.canvasKit.XYWHRect(
        0, 0,
        sprite.texture.baseTexture.width,
        sprite.texture.baseTexture.height
      );

      // Создаем прямоугольник куда будем рисовать картинку на экране
      const dstRect = this.canvasKit.XYWHRect(
        x, y,
        sprite.texture.baseTexture.width * transform.a,
        sprite.texture.baseTexture.height * transform.d
      );

      // Если есть поворот, применяем его к спрайту
      if (sprite.angle !== 0) {
        const bounds = sprite.getBounds();
        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height / 2;
        const radians = sprite.angle * Math.PI / 180;
        this.skCanvas.rotate(radians, centerX, centerY);
      }

      // Рисуем картинку на экране
      this.skCanvas.drawImageRect(image, srcRect, dstRect, paint);
      
      // Возвращаем рисунок в исходное положение после поворота
      this.skCanvas.restore();
    } catch (error) {
      console.error('Error rendering sprite:', error);
    }
  }

  /**
   * Загрузка изображения
   * @param url - URL изображения
   */
  private async loadImage(url: string): Promise<any> {
    if (this.imageCache.has(url)) {
      return this.imageCache.get(url);
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = async () => {
        try {
          const imageData = await this.canvasKit.MakeImageFromCanvasImageSource(img);
          if (imageData) {
            this.imageCache.set(url, imageData);
            resolve(imageData);
          } else {
            reject(new Error('Failed to create Skia image'));
          }
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;
    });
  }

  /**
   * Добавление спрайта в PDF
   * @param doc - Документ PDF
   * @param sprite - PIXI.Sprite объект
   */
  private async addSpriteToPDF(doc: any, sprite: PIXI.Sprite): Promise<void> {
    if (!sprite.texture.baseTexture.resource.url) {
      console.warn('Sprite has no image URL');
      return;
    }

    try {
      // Загружаем изображение как base64
      const response = await fetch(sprite.texture.baseTexture.resource.url);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      // Получаем трансформации
      const transform = sprite.transform.worldTransform;
      let x = transform.tx;
      let y = transform.ty;
      const width = sprite.texture.baseTexture.width * transform.a;
      const height = sprite.texture.baseTexture.height * transform.d;

      // Если есть поворот, вычисляем новые координаты
      if (sprite.angle !== 0) {
        const bounds = sprite.getBounds();
        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height / 2;
        const angle = sprite.angle * Math.PI / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        
        // Вычисляем смещение относительно центра
        const dx = x - centerX;
        const dy = y - centerY;
        
        // Поворачиваем точку вокруг центра
        x = centerX + (dx * cos - dy * sin);
        y = centerY + (dx * sin + dy * cos);
      }

      // Добавляем изображение в PDF
      doc.addImage(base64, 'PNG', x, y, width, height, undefined, sprite.angle);
    } catch (error) {
      console.error('Error adding sprite to PDF:', error);
    }
  }

  /**
   * Экспорт в PDF
   */
  public async exportToPDF(): Promise<Uint8Array> {
    try {
      console.log('Starting PDF export...');
      const doc = new jsPDF({
        orientation: this.width > this.height ? 'l' : 'p',
        unit: 'pt',
        format: [this.width, this.height]
      });

      // Рекурсивная функция для обхода контейнера
      const processContainer = async (container: PIXI.Container) => {
        for (const child of container.children) {
          if (child instanceof PIXI.Graphics) {
            // Рендерим каждую фигуру
            child.geometry.graphicsData.forEach(data => {
              // Получаем данные о положении фигуры
              const transform = child.transform.worldTransform;

              // Обрабатываем линии
              if (data.lineStyle.visible && data.points && data.points.length >= 4) {
                const color = this.convertToRGB(data.lineStyle.color);
                doc.setDrawColor(color.r, color.g, color.b);
                doc.setLineWidth(data.lineStyle.width);

                // Получаем координаты линии
                let startX = transform.tx + data.points[0];
                let startY = transform.ty + data.points[1];
                let endX = transform.tx + data.points[2];
                let endY = transform.ty + data.points[3];

                // Если есть поворот, поворачиваем точки
                if (child.angle !== 0) {
                  const centerX = (startX + endX) / 2;
                  const centerY = (startY + endY) / 2;
                  
                  const startPoint = {
                    x: centerX + (startX - centerX) * Math.cos(child.angle * Math.PI / 180) - (startY - centerY) * Math.sin(child.angle * Math.PI / 180),
                    y: centerY + (startX - centerX) * Math.sin(child.angle * Math.PI / 180) + (startY - centerY) * Math.cos(child.angle * Math.PI / 180)
                  };
                  const endPoint = {
                    x: centerX + (endX - centerX) * Math.cos(child.angle * Math.PI / 180) - (endY - centerY) * Math.sin(child.angle * Math.PI / 180),
                    y: centerY + (endX - centerX) * Math.sin(child.angle * Math.PI / 180) + (endY - centerY) * Math.cos(child.angle * Math.PI / 180)
                  };
                  
                  startX = startPoint.x;
                  startY = startPoint.y;
                  endX = endPoint.x;
                  endY = endPoint.y;
                }

                // Рисуем линию
                doc.line(startX, startY, endX, endY);
              }

              // Обрабатываем фигуры
              if (data.shape instanceof PIXI.Rectangle) {
                let x = transform.tx + data.shape.x;
                let y = transform.ty + data.shape.y;
                const width = data.shape.width * transform.a;
                const height = data.shape.height * transform.d;

                if (data.fillStyle.visible) {
                  const color = this.convertToRGB(data.fillStyle.color);
                  doc.setFillColor(color.r, color.g, color.b);
                  
                  // Круг остается кругом при любом повороте, 
                  // нужно только правильно позиционировать центр
                  if (child.angle !== 0) {
                    const bounds = child.getBounds();
                    const centerX = bounds.x + bounds.width / 2;
                    const centerY = bounds.y + bounds.height / 2;
                    const rotated = {
                      x: centerX + (x - centerX) * Math.cos(child.angle * Math.PI / 180) - (y - centerY) * Math.sin(child.angle * Math.PI / 180),
                      y: centerY + (x - centerX) * Math.sin(child.angle * Math.PI / 180) + (y - centerY) * Math.cos(child.angle * Math.PI / 180)
                    };
                    x = rotated.x;
                    y = rotated.y;
                  }

                  doc.rect(x, y, width, height, 'F');
                }
              } else if (data.shape instanceof PIXI.Circle) {
                let x = transform.tx + data.shape.x;
                let y = transform.ty + data.shape.y;
                const radius = data.shape.radius * Math.abs(transform.a);

                if (data.fillStyle.visible) {
                  const color = this.convertToRGB(data.fillStyle.color);
                  doc.setFillColor(color.r, color.g, color.b);
                  
                  // Круг остается кругом при любом повороте, 
                  // нужно только правильно позиционировать центр
                  if (child.angle !== 0) {
                    const bounds = child.getBounds();
                    const centerX = bounds.x + bounds.width / 2;
                    const centerY = bounds.y + bounds.height / 2;
                    const rotated = {
                      x: centerX + (x - centerX) * Math.cos(child.angle * Math.PI / 180) - (y - centerY) * Math.sin(child.angle * Math.PI / 180),
                      y: centerY + (x - centerX) * Math.sin(child.angle * Math.PI / 180) + (y - centerY) * Math.cos(child.angle * Math.PI / 180)
                    };
                    x = rotated.x;
                    y = rotated.y;
                  }

                  doc.circle(x, y, radius, 'F');
                }
              }
            });
          } else if (child instanceof PIXI.Sprite) {
            await this.addSpriteToPDF(doc, child);
          } else if (child instanceof PIXI.Container) {
            // Рендерим все элементы внутри контейнера
            await this.renderContainer(child);
          }
        }
      };

      // Обрабатываем все объекты
      await processContainer(this.container);

      // Возвращаем PDF как Uint8Array
      const pdfData = doc.output('arraybuffer');
      return new Uint8Array(pdfData);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      throw error;
    }
  }

  /**
   * Преобразование цвета в RGB формат
   * @param color - Цвет в формате 0xRRGGBB
   */
  private convertToRGB(color: number): { r: number, g: number, b: number } {
    return {
      r: (color >> 16) & 0xFF,
      g: (color >> 8) & 0xFF,
      b: color & 0xFF
    };
  }

  /**
   * Настраиваем обработку событий указателя
   */
  private setupPointerEvents(): void {
    // Функция для проверки попадания точки в фигуру
    const hitTest = (point: { x: number, y: number }, graphics: PIXI.Graphics): boolean => {
      const bounds = graphics.getBounds();
      
      // Если клик был сделан за пределами границ фигуры, дальше не проверяем
      if (!bounds.contains(point.x, point.y)) {
        return false;
      }

      // Для поворота преобразуем координаты точки
      if (graphics.angle !== 0) {
        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height / 2;
        const radians = -graphics.angle * Math.PI / 180; // Отрицательный угол для обратного поворота
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        
        // Поворачиваем точку в локальную систему координат фигуры
        const dx = point.x - centerX;
        const dy = point.y - centerY;
        point = {
          x: centerX + (cos * dx - sin * dy),
          y: centerY + (sin * dx + cos * dy)
        };
      }

      // Проверяем каждую нарисованную фигуру - попал ли клик внутрь неё
      return graphics.geometry.graphicsData.some(data => {
        if (data.shape instanceof PIXI.Rectangle) {
          const x = graphics.position.x + data.shape.x;
          const y = graphics.position.y + data.shape.y;
          return point.x >= x && 
                 point.x <= x + data.shape.width * graphics.scale.x && 
                 point.y >= y && 
                 point.y <= y + data.shape.height * graphics.scale.y;
        } 
        else if (data.shape instanceof PIXI.Circle) {
          const centerX = graphics.position.x + data.shape.x;
          const centerY = graphics.position.y + data.shape.y;
          const dx = point.x - centerX;
          const dy = point.y - centerY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          return distance <= data.shape.radius * graphics.scale.x;
        }
        // Для линий используем упрощенную проверку попадания точки в прямоугольник, ограничивающий линию
        else if (data.points && data.points.length >= 4) {
          return true;
        }
        return false;
      });
    };

    // Обработчик pointerdown
    this.canvas.addEventListener('pointerdown', (event) => {
      // Запоминаем где именно произошло нажатие
      const point = {
        x: event.offsetX,
        y: event.offsetY
      };

      // Проходим по всем объектам в обратном порядке (сверху вниз)
      const children = [...this.container.children].reverse();
      for (const child of children) {
        if (child instanceof PIXI.Graphics && hitTest(point, child)) {
          // Создаем событие в стиле Pixi.js
          const pixiEvent = {
            type: 'pointerdown',
            target: child,
            data: {
              global: new PIXI.Point(point.x, point.y),
              originalEvent: event
            }
          };
          child.emit('pointerdown', pixiEvent);
          break; // Прекращаем поиск после первого попадания
        }
      }
    });

    // Обработчик pointerup
    this.canvas.addEventListener('pointerup', (event) => {
      // Запоминаем где именно произошло нажатие
      const point = {
        x: event.offsetX,
        y: event.offsetY
      };

      // Проходим по всем объектам в обратном порядке (сверху вниз)
      const children = [...this.container.children].reverse();
      for (const child of children) {
        if (child instanceof PIXI.Graphics && hitTest(point, child)) {
          // Создаем событие в стиле Pixi.js
          const pixiEvent = {
            type: 'pointerup',
            target: child,
            data: {
              global: new PIXI.Point(point.x, point.y),
              originalEvent: event
            }
          };
          child.emit('pointerup', pixiEvent);
          break; // Прекращаем поиск после первого попадания
        }
      }
    });
  }

  /**
   * Удаление ресурсов
   */
  dispose(): void {
    // Очищаем кэш изображений
    this.imageCache.forEach(image => {
      if (image && typeof image.delete === 'function') {
        image.delete();
      }
    });
    this.imageCache.clear();

    if (this.paint) {
      this.paint.delete();
    }
    if (this.surface) {
      this.surface.delete();
    }
  }

  /**
   * Преобразование цвета в формат Skia
   * @param color - Цвет в формате 0xRRGGBB
   */
  private convertColor(color: number): Float32Array {
    const r = ((color >> 16) & 0xFF) / 255;
    const g = ((color >> 8) & 0xFF) / 255;
    const b = (color & 0xFF) / 255;
    return Float32Array.of(r, g, b, 1.0);
  }
}
