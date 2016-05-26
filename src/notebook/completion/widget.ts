// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  Message
} from 'phosphor-messaging';

import {
  ISignal, Signal, clearSignalData
} from 'phosphor-signaling';

import {
  Widget
} from 'phosphor-widget';

import {
  ICompletionModel
} from './model';

/**
 * The class name added to completion menu widgets.
 */
const COMPLETION_CLASS = 'jp-Completion';

/**
 * The class name added to completion menu contents.
 */
const ITEM_CLASS = 'jp-Completion-item';

/**
 * The maximum height of a completion widget.
 */
const MAX_HEIGHT = 250;


export
class CompletionWidget extends Widget {
  /**
   * Create the DOM node for a text completion menu.
   */
  static createNode(): HTMLElement {
    let node = document.createElement('ul');
    return node;
  }

  /**
   * Construct a text completion menu widget.
   */
  constructor(model: ICompletionModel) {
    super();
    this._model = model;
    this._model.stateChanged.connect(() => this.update(), this);
    this.addClass(COMPLETION_CLASS);
    this.update();
  }

  /**
   * A signal emitted when a selection is made from the completion menu.
   */
  get selected(): ISignal<CompletionWidget, string> {
    return Private.selectedSignal.bind(this);
  }

  /**
   * The semantic parent of the completion widget, its reference widget.
   */
  get reference(): Widget {
    return this._reference;
  }
  set reference(widget: Widget) {
    this._reference = widget;
  }

  /**
   * Dispose of the resources held by the completion widget.
   */
  dispose() {
    if (this.isDisposed) return;
    this._model.dispose();
    this._model = null;
    clearSignalData(this);
    super.dispose();
  }

  /**
   * Handle the DOM events for the widget.
   *
   * @param event - The DOM event sent to the widget.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the dock panel's node. It should
   * not be called directly by user code.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
    case 'keydown':
      this._evtKeydown(event as KeyboardEvent);
      break;
    case 'mousedown':
      this._evtMousedown(event as MouseEvent);
      break;
    }
  }

  /**
   * Handle `after_attach` messages for the widget.
   *
   * #### Notes
   * Captures document events in capture phase to dismiss or navigate the
   * completion widget.
   */
  protected onAfterAttach(msg: Message): void {
    document.addEventListener('keydown', this, true);
    document.addEventListener('mousedown', this, true);
  }

  /**
   * Handle `before_detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    document.removeEventListener('keydown', this);
    document.removeEventListener('mousedown', this);
  }

  /**
   * Handle `update_request` messages.
   */
  protected onUpdateRequest(msg: Message): void {
    let node = this.node;
    let items = this._model.items;
    node.textContent = '';

    if (!items || !items.length) {
      this.hide();
      return;
    }

    for (let item of items) {
      let li = document.createElement('li');
      let code = document.createElement('code');

      // Set the raw, un-marked up value as a data attribute.
      li.dataset['value'] = item.raw;

      // Use innerHTML because search results include <mark> tags.
      code.innerHTML = item.text;

      li.className = ITEM_CLASS;
      li.appendChild(code);
      node.appendChild(li);
    }

    if (this.isHidden) this.show();

    let coords = this._model.current ? this._model.current.coords
      : this._model.original.coords;
    let availableHeight = coords.top;
    let maxHeight = Math.min(availableHeight, MAX_HEIGHT);
    node.style.maxHeight = `${maxHeight}px`;

    // Account for 1px border width.
    let left = Math.floor(coords.left) + 1;
    let rect = node.getBoundingClientRect();
    let top = maxHeight - rect.height;
    node.style.left = `${left}px`;
    node.style.top = `${top}px`;
    node.style.width = 'auto';
    // Expand the menu width by the scrollbar size, if present.
    if (node.scrollHeight > maxHeight) {
      node.style.width = `${2 * node.offsetWidth - node.clientWidth}px`;
    }
  }

  /**
   * Handle mousedown events for the widget.
   */
  private _evtMousedown(event: MouseEvent) {
    let target = event.target as HTMLElement;
    while (target !== document.documentElement) {
      // If the user has made a selection, emit its value and reset the model.
      if (target.classList.contains(ITEM_CLASS)) {
        this.selected.emit(target.dataset['value']);
        this._model.reset();
        return;
      }
      // If the mouse event happened anywhere else in the widget, bail.
      if (target === this.node) {
        return;
      }
      target = target.parentElement;
    }
    this._model.reset();
  }

  /**
   * Handle keydown events for the widget.
   */
  private _evtKeydown(event: KeyboardEvent) {
    let target = event.target as HTMLElement;
    while (target !== document.documentElement) {
      if (target === this.node) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      target = target.parentElement;
    }
    this.hide();
  }

  private _model: ICompletionModel = null;
  private _reference: Widget = null;
}


/**
 * A namespace for completion widget private data.
 */
namespace Private {
  /**
   * A signal emitted when state of the completion menu changes.
   */
  export
  const selectedSignal = new Signal<CompletionWidget, string>();
}
