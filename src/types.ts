import * as PIXI from 'pixi.js-legacy';

export interface SkiaRenderer {
  /**
   * Рендерит PIXI.Container на Skia canvas
   * @param container PIXI контейнер для рендера
   */
  render(container: PIXI.Container): void;

  /**
   * Сохраняет все нарисованные фигуры в PDF файл, сохраняя их качество
   * @returns Возвращает данные PDF файла, которые можно сохранить
   */
  exportToPDF(): Promise<Uint8Array>;

  /**
   * Освобождает память и удаляет все временные данные после завершения работы
   */
  dispose(): void;

  /**
   * Делает объект интерактивным - реагирующим на клики мышкой и касания пальцем
   * @param object Графический объект, который нужно сделать интерактивным
   */
  // Добавляем возможность кликать и нажимать на объект
  addPointerEvents(object: PIXI.DisplayObject): void;
}
