// Copyright (C) 2014-2015 Lester Carballo Pérez <lestcape@gmail.com>
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License
// as published by the Free Software Foundation; either version 2
// of the License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program; if not, write to the Free Software
// Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.

const St = imports.gi.St;
const Gtk = imports.gi.Gtk;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Meta = imports.gi.Meta;
const Cinnamon = imports.gi.Cinnamon;
const Clutter = imports.gi.Clutter;
const Gettext = imports.gettext;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Signals = imports.signals;
const DND = imports.ui.dnd;
const Main = imports.ui.main;
const AppFavorites = imports.ui.appFavorites;
const Tweener = imports.ui.tweener;
const GnomeSession = imports.misc.gnomeSession;
const ScreenSaver = imports.misc.screenSaver;

const AppletPath = imports.ui.appletManager.applets['configurableMenu@lestcape'];
const ConfigurableMenus = AppletPath.configurableMenus;
const MenuItems = AppletPath.menuItems;
//MenuBox

function _(str) {
   let resultConf = Gettext.dgettext("configurableMenu@lestcape", str);
   if(resultConf != str) {
      return resultConf;
   }
   return Gettext.gettext(str);
};

function PlacesGnomeBox(parent, selectedAppBox, hover, iconSize, iconView, scrollBox, textButtonWidth) {
   this._init(parent, selectedAppBox, hover, iconSize, iconView, scrollBox, textButtonWidth);
}

PlacesGnomeBox.prototype = {
   _init: function(parent, selectedAppBox, hover, iconSize, iconView, scrollBox, textButtonWidth) {
      this.parent = parent;
      this.selectedAppBox = selectedAppBox;
      this.hover = hover;
      this.iconSize = iconSize;
      this.iconView = iconView;
      this.textButtonWidh = textButtonWidth;
      this.appButtonDescription = this.appButtonDescription;
      this.scrollBox = scrollBox;
      this.actor = new St.BoxLayout({ vertical: true });
      this._listPlaces = new Array();
      Main.placesManager.connect('mounts-updated', Lang.bind(this, this._refreshMount));
      this.refreshPlaces();
   },

   destroy: function() {
      this.separator1.destroy();
      this.separator2.destroy();
      for(let i = 0; i < this._listPlaces.length; i++) {
         this._listPlaces[i].destroy();
      }
      this.actor.destroy();
   },

   refreshPlaces: function() {
      this.actor.destroy_all_children();
      this.specialPlaces = new St.BoxLayout({ vertical: true });
      this._addPlaces(this.specialPlaces, this.parent._listSpecialBookmarks());
      this.actor.add(this.specialPlaces, {x_fill: true, expand: true});
      this.separator1 = new ConfigurableMenus.ConfigurableSeparatorMenuItem();
      this.separator1.setVisible(true);
      this.separator1.setSpace(20);
      this.actor.add_actor(this.separator1.actor);
      this.bookmarksPlaces = new St.BoxLayout({ vertical: true });
      this._addPlaces(this.bookmarksPlaces, Main.placesManager.getBookmarks());
      this.actor.add(this.bookmarksPlaces, {x_fill: true, expand: true});
      this.separator2 = new ConfigurableMenus.ConfigurableSeparatorMenuItem();
      this.separator2.setVisible(true);
      this.separator2.setSpace(20);
      this.actor.add_actor(this.separator2.actor);
      this.removablePlaces = new St.BoxLayout({ vertical: true });
      this.actor.add(this.removablePlaces, {x_fill: true, expand: true});
      this._refreshMount();
   },

   _addPlaces: function(actor, places) {
      for(let i = 0; i < places.length; i++) {
         let place = places[i];
         let button = new MenuItems.PlaceButton(this.parent, this.scrollBox, place, this.iconView,
                                              this.iconSize, this.textButtonWidth, this.appButtonDescription);
         button.actor.connect('enter-event', Lang.bind(this, function() {
            button.actor.style_class = "menu-category-button-selected";
            this.selectedAppBox.setSelectedText(button.app.get_name(), button.app.get_description());
            this.hover.refreshPlace(button.place);
            this.parent.appMenuClose();
            this.parent._clearPrevCatSelection();
         }));
         button.actor.connect('leave-event', Lang.bind(this, function() {
            button.actor.style_class = "menu-category-button";
            this.selectedAppBox.setSelectedText("", "");
            this.hover.refreshFace();
         }));
         //if(this._applicationsBoxWidth > 0)
         //   button.container.set_width(this._applicationsBoxWidth);
         actor.add(button.actor, {x_fill: true, expand: true});
         actor.add(button.menu.actor, {x_fill: true, expand: true});

         this._listPlaces.push(button);
      }
   },

   //closeAllContextMenu: function(excludeApp, animate) {
   //   let menuC;
   //   for(let i = 0; i < this._listPlaces.length; i++) {
   //      menuC = this._listPlaces[i].menu;
   //      if((menuC)&&(menuC.isOpen)&&(menuC != excludeApp)) {
   //         if(animate)
   //            menuC.toggle();
   //         else
   //            menuC.close();
   //      }
   //   }
   //},

   _removeRemovable: function() {
      let placesChilds = this.removablePlaces.get_children();
      for(let i = 0; i < placesChilds.length; i++) {
         for(let j = 0; j < this._listPlaces.length; j++) {
            if(this._listPlaces[j].actor == placesChilds[i]) {
               this._listPlaces.splice(j,1);
               break;
            }
         }
         break;
      }
      this.removablePlaces.destroy_all_children();
   },

   _refreshMount: function() {
      try {
         this._removeRemovable();
         this.parent._updateSize();
         let mounts = Main.placesManager.getMounts();
         let drive;
         for(let i = 0; i < mounts.length; i++) {
            if(mounts[i].isRemovable()) {
               drive = new MenuItems.DriveMenuItem(this.parent, this.selectedAppBox, this.hover, mounts[i], this.iconSize, true);
               drive.actor.connect('enter-event', Lang.bind(this, function() {
                  this.parent.appMenuClose();
                  this.parent._clearPrevCatSelection();
                  //drive.actor.style_class = "menu-category-button-selected";
                  //this.selectedAppBox.setSelectedText(button.app.get_name(), button.app.get_description());
                  //this.hover.refreshPlace(button.place);
                  //this.parent.appMenuClose();
               }));
               this.removablePlaces.add_actor(drive.actor);
               this._listPlaces.push(drive);
            }
         }

      } catch(e) {
         global.logError(e);
         Main.notify("ErrorDevice:", e.message);
      }
   }
};

function FavoritesBoxLine(parentBox, vertical) {
   this._init(parentBox, vertical);
}

FavoritesBoxLine.prototype = {
   _init: function(parentBox, vertical) {
      this.parentBox = parentBox;
      this.vertical = vertical;
      this.actor = new St.BoxLayout({ vertical: vertical });
      this.actor._delegate = this;
        
      this._dragPlaceholder = null;
      this._dragPlaceholderPos = -1;
      this._animatingPlaceholdersCount = 0;
   },

   destroy: function() {
      this.actor.destroy();
   },
    
   _clearDragPlaceholder: function() {
      if(this._dragPlaceholder) {
         this._dragPlaceholder.animateOutAndDestroy();
         this._dragPlaceholder = null;
         this._dragPlaceholderPos = -1;
      }
   },
    
   handleDragOver : function(source, actor, x, y, time) {
      try {
         let app = source.app;
         // Don't allow favoriting of transient apps
         if(app == null || app.is_window_backed() || (!(source instanceof MenuItems.FavoritesButton) && app.get_id() in AppFavorites.getAppFavorites().getFavoriteMap()))
            return DND.DragMotionResult.NO_DROP;

         let favorites = AppFavorites.getAppFavorites().getFavorites();
         let favPos = favorites.indexOf(app);

         let children = this.actor.get_children();
         let numChildren = children.length;
         let boxSize;
         let coord;
         if(this.actor.get_vertical()) {
            boxSize = this.actor.height;
            coord = y;
         } else {
            boxSize = this.actor.width;
            coord = x;
         }
         // Keep the placeholder out of the index calculation; assuming that
         // the remove target has the same size as "normal" items, we don't
         // need to do the same adjustment there.
         if(this._dragPlaceholder) {
            if(this.actor.get_vertical())
               boxSize -= this._dragPlaceholder.actor.height;
            else
               boxSize -= this._dragPlaceholder.actor.width;
            numChildren--;
         }

         let pos = Math.round(coord * numChildren / (boxSize));
        // if(pos != this._dragPlaceholderPos && pos <= numChildren) {
         if(pos <= numChildren) {
          //  if(this._animatingPlaceholdersCount > 0) {
          //     let appChildren = children.filter(function(actor) {
          //        return (actor._delegate instanceof FavoritesButton);
          //     });
          //     this._dragPlaceholderPos = children.indexOf(appChildren[pos]);
          //  } else {
               this._dragPlaceholderPos = pos;
         //   }

            // Don't allow positioning before or after self
           // if(favPos != -1 && (pos == favPos || pos == favPos + 1)) {
           //    if(this._dragPlaceholder) {
           //       this._dragPlaceholder.animateOutAndDestroy();
           //       this._animatingPlaceholdersCount++;
           //       this._dragPlaceholder.actor.connect('destroy',
           //       Lang.bind(this, function() {
           //          this._animatingPlaceholdersCount--;
           //       }));
           //    }
           //    this._dragPlaceholder = null;

           //    return DND.DragMotionResult.CONTINUE;
           // }

            // If the placeholder already exists, we just move
            // it, but if we are adding it, expand its size in
            // an animation
            let fadeIn;
            if(this._dragPlaceholder) {
               let parentPlaceHolder = this._dragPlaceholder.actor.get_parent();
               if(parentPlaceHolder) parentPlaceHolder.remove_actor(this._dragPlaceholder.actor);
               this._dragPlaceholder.actor.destroy();
               fadeIn = false;
            } else {
               fadeIn = true;
            }

            this._dragPlaceholder = new DND.GenericDragPlaceholderItem();
            this._dragPlaceholder.child.set_width (source.actor.height);
            this._dragPlaceholder.child.set_height (source.actor.height);
            this.actor.insert_actor(this._dragPlaceholder.actor, this._dragPlaceholderPos);
            this.parentBox.setDragPlaceholder(this._dragPlaceholder);
            if(fadeIn)
               this._dragPlaceholder.animateIn();
         }

         let srcIsFavorite = (favPos != -1);

         if(srcIsFavorite)
            return DND.DragMotionResult.MOVE_DROP;

         return DND.DragMotionResult.COPY_DROP;
      } catch(e) {
         Main.notify("Invalid Drag: " + e.message);
      }
      return DND.DragMotionResult.NO_DROP;
   },
    
   // Draggable target interface
   acceptDrop : function(source, actor, x, y, time) {
      try {
         let app = source.app;

         // Don't allow favoriting of transient apps
         if(app == null || app.is_window_backed()) {
            return false;
         }

         let id = app.get_id();

         let favorites = AppFavorites.getAppFavorites().getFavoriteMap();

         let srcIsFavorite = (id in favorites);

         let favPos = 0;
         let children = this.actor.get_children();
         if(children.length == 0)
            favPos = favorites.length -1;
         else {
            for(let i = 0; i < this._dragPlaceholderPos; i++) {
               if(this._dragPlaceholder &&
                  children[i] == this._dragPlaceholder.actor)
                  continue;
            
               if(!(children[i]._delegate instanceof MenuItems.FavoritesButton)) continue;

               let childId = children[i]._delegate.app.get_id();
               if(childId == id)
                  continue;
               if(childId in favorites)
                  favPos++;
            }
            favPos = this.parentBox.getBeginPosAtLine(this, favPos);
         }

         Meta.later_add(Meta.LaterType.BEFORE_REDRAW, Lang.bind(this, function () {
            Mainloop.idle_add(Lang.bind(this, function() {
               let appFavorites = AppFavorites.getAppFavorites();
               if(srcIsFavorite)
                  appFavorites.moveFavoriteToPos(id, favPos);
               else
                  appFavorites.addFavoriteAtPos(id, favPos);
            }));
            return false;
         }));

         return true;
      } catch(e) {
         Main.notify("Drop Fail:" + e.message);
      }
      return false;
   }
};

function FavoritesBoxExtended() {
   this._init.apply(this, arguments);
}

FavoritesBoxExtended.prototype = {
   __proto__: ConfigurableMenus.ConfigurablePopupMenuSection.prototype,

   _init: function(parent, numberLines, vertical) {
      ConfigurableMenus.ConfigurablePopupMenuSection.prototype._init.call(this);
      vertical = (vertical == true);
      this._parent = parent;
      this._favRefresh = true;
      this._lastFocus = null;
      this._firstElement = null;
      this.scrollBox = new ConfigurableMenus.ScrollItemsBox(this, this.box, vertical, St.Align.START);
      this.actor = this.scrollBox.actor;
      this.actor.add(this.box);
      //this.actor._delegate = this;
      this.linesDragPlaces = new Array();
      let internalLine;
      for(let i = 0; i < numberLines; i++) {
         internalLine = new FavoritesBoxLine(this, !vertical);
         this.linesDragPlaces.push(internalLine);
         this.box.add(internalLine.actor, { x_align: St.Align.MIDDLE, y_align: St.Align.START, x_fill: true, y_fill: false, expand: true });
      }

      this.box.set_vertical(vertical);
      this.setVertical(vertical);
   },

   _onKeyFocusChanged: function() {
      let focusedActor = global.stage.get_key_focus();
   },

   _onEnterEvent: function(actor) {
      this._lastFocus = global.stage.get_key_focus();
   },

   _addInCorrectBox: function(box, actor, menu, properties) {
      box.add(actor, properties);
      box.add_actor(menu.actor);
   },

   _navegateFocusOut: function(linesDragPlaces) {
      let focus = global.stage.get_key_focus();
      if(linesDragPlaces.actor.contains(focus)) {
         if(this._lastFocus)
            this._lastFocus.grab_key_focus();
         else
            global.stage.set_key_focus(null);
      }
   },

   _generateChildrenList: function() {
      let result = new Array();
      let childrens = this.box.get_children();
      let childrensItems;
      for(let i = 0; i < childrens.length; i++) {
         childrensItems = childrens[i].get_children();
         for(let j = 0; j < childrensItems.length; j++) {
            result.push(childrensItems[j]);
         }
      }
      return result;
   },

   setDragPlaceholder: function(dragPlaceholder) {
      let currLinePlaceholder;
      this._dragPlaceholder = dragPlaceholder;
      for(let i = 0; i < this.linesDragPlaces.length; i++) {
         currLinePlaceholder = this.linesDragPlaces[i];
         if((currLinePlaceholder._dragPlaceholder)&&(currLinePlaceholder._dragPlaceholder != dragPlaceholder)) {
            currLinePlaceholder._clearDragPlaceholder();
         }
      }
   },

   activeHoverElement: function(actor) {
      let result = new Array();
      let childrens = this.box.get_children();
      let childrensItems;
      for(let i = 0; i < childrens.length; i++) {
         childrensItems = childrens[i].get_children();
         for(let j = 0; j < childrensItems.length; j++) {
            childrensItems[j].remove_style_pseudo_class('hover');
         }
      }
      if(actor) {
         actor.add_style_pseudo_class('hover');
         this._parent.favoritesScrollBox.scrollToActor(actor);
      }
   },

   getNumberLines: function() {
      return this.linesDragPlaces.length;
   },

   getBeginPosAtLine: function(line, itemPos) {
      this._favRefresh = false;
      let sumOfElements = 0;
      if(itemPos > 0)
         sumOfElements += this.linesDragPlaces.length*(itemPos);
      return sumOfElements + this.linesDragPlaces.indexOf(line);
   },

   needRefresh: function() {
      return this._favRefresh;
   },

   setNumberLines: function(numberLines) {
      let childrens;
      let saveItems = new Array();
      for(let i = 0; i < this.linesDragPlaces.length; i++) {
         childrens = this.linesDragPlaces[i].actor.get_children();
         for(let j = 0; j < childrens.length; j++) {
            saveItems.push(childrens[j]);
            this.linesDragPlaces[i].actor.remove_actor(childrens[j]);
         }
      }
      let internalLine;
      for(let i = this.linesDragPlaces.length; i < numberLines; i++) {
         internalLine = new FavoritesBoxLine(this, this.isVertical());
         this.linesDragPlaces.push(internalLine);
         this.box.add(internalLine.actor, { x_align: St.Align.MIDDLE, y_align: St.Align.START, x_fill: true, y_fill: false, expand: true });
      }
      let lastPos = this.linesDragPlaces.length;
      while(numberLines < lastPos) {
         lastPos--;
         if(this.linesDragPlaces[lastPos].actor.get_parent() == this.box)
            this.box.remove_actor(this.linesDragPlaces[lastPos].actor);
         this.linesDragPlaces[lastPos].actor.destroy();
         this.linesDragPlaces.splice(lastPos, 1);
      }
      for(let i = 0; i < saveItems.length; i++) {
         this.add(saveItems[i]);
      }
      //Main.notify("chil:" + this.box.get_children().length + " line:" + this.linesDragPlaces.length);
   },

   setVertical: function(vertical) {
      if(vertical != this.isVertical()) {
         this.box.set_vertical(vertical);
         this.scrollBox.setVertical(vertical);
         let childrens = this.box.get_children();
         for(let i = 0; i < childrens.length; i++) {
            childrens[i].set_vertical(!vertical);
         }
      }
   },

   isVertical: function() {
      return this.box.get_vertical();
   },

   getRealSpace: function() {
      let result = 0;
      let childrens = this.box.get_children();
      for(let i = 0; i < childrens.length; i++)
         result += childrens[i].get_height();
      return result;
   },

   addMenuItem: function(menuItem, position, properties) {
      try {
         if(!this._firstElement) {
            this._firstElement = menuItem.actor;
            this._firstElement.connect('key-focus-in', Lang.bind(this, function(actor, event) {
               this.activeHoverElement(actor);
            }));
         }
         menuItem.actor.connect('enter-event', Lang.bind(this, this._onEnterEvent));
         let childrens = this.box.get_children();
         let currentNumberItems = childrens[0].get_children().length;
         for(let i = 1; i < childrens.length; i++) {
            if(currentNumberItems > childrens[i].get_children().length) {
               this._addInCorrectBox(childrens[i], menuItem.actor, menuItem.menu, properties);
               currentNumberItems--; 
               break;
            }
         }
         if(currentNumberItems == childrens[0].get_children().length)
            this._addInCorrectBox(childrens[0], menuItem.actor, menuItem.menu, properties);
      
      } catch(e) {
         Main.notify("Favorite add element error", e.message);
      }
   },

   removeAll: function() {
      try {
         this._firstElement = null;
         //Remove all favorites and release the focus if is necessary.
         for(let i = 0; i < this.linesDragPlaces.length; i++) {
            this._navegateFocusOut(this.linesDragPlaces[i]);
            this.linesDragPlaces[i].actor.destroy();
         }
         if(this._dragPlaceholder) {
            let parentHolder = this._dragPlaceholder.actor.get_parent();
            if(parentHolder)
               parentHolder.remove_actor(this._dragPlaceholder.actor);
            this._dragPlaceholder = null;
         }
         this._favRefresh = true;
         this.linesDragPlaces = new Array();
      } catch(e) {
         Main.notify("Favorite remove element error", e.message);
      }
   },

   getFirstElement: function() {
     // let childrens = this.box.get_children();
     // if(childrens.length > 0) {
     //    let childrensItems = childrens[0].get_children();
     //    if(childrensItems.length > 0)
     //       return childrensItems[0];
     // }
     // return null;
      return this._firstElement;
   },

   isInBorder: function(symbol, actor) {
      let childrens = this.box.get_children();
      let childrensItems;
      let posX, posY;
      for(let i = 0; i < childrens.length; i++) {
         childrensItems = childrens[i].get_children();
         for(let j = 0; j < childrensItems.length; j++) {
            if(childrensItems[j] == actor)  {
               posY = i;
               posX = j;
               break;
            }
         }
         if(posX)
            break;
      }
      if(symbol == Clutter.KEY_Left)
         return (((this.isVertical())&&(posY == 0))||((!this.isVertical())&&(posX == 0)));
      if(symbol == Clutter.KEY_Right)
         return (((this.isVertical())&&(posY == childrens.length - 1))||((!this.isVertical())&&(posX == childrens[posY].get_children().length - 2)));
      if(symbol == Clutter.KEY_Down) {
         return (((this.isVertical())&&(posX  == childrens[posY].get_children().length - 2))||((!this.isVertical())&&(posY == childrens.length - 1)));
      }
      if(symbol == Clutter.KEY_Up)
         return (((this.isVertical())&&(posX == 0))||((!this.isVertical())&&(posY == 0)));
      return false;
   },

   navegate: function(symbol, actor) {
      let childrens = this.box.get_children();
      let childrensItems;
      let posX, posY;
      for(let i = 0; i < childrens.length; i++) {
         childrensItems = childrens[i].get_children();
         for(let j = 0; j < childrensItems.length; j++) {
            if(childrensItems[j] == actor)  {
               posY = i;
               posX = j;
               break;
            }
         }
         if(posX)
            break;
      }
      if(this.isVertical()) {
         if(symbol == Clutter.KEY_Up) {
            if(posX == 0)
               posX = childrens[posY].get_children().length - 2;
            else
               posX -= 2;
         }
         else if(symbol == Clutter.KEY_Down) {
            if(posX == childrens[posY].get_children().length - 2)
               posX = 0;
            else
               posX += 2;
         }
         else if(symbol == Clutter.KEY_Right) {
            if(posY == childrens.length - 1)
               posY = 0;
            else
               posY += 1;
         }
         else if(symbol == Clutter.KEY_Left) {
            if(posY == 0)
               posY = childrens.length - 1;
            else
               posY -= 1;
         }
      }
      else {
        if(symbol == Clutter.KEY_Up) {
            if(posY == 0)
               posY = childrens.length - 1;
            else
               posY -= 1;
         }
         else if(symbol == Clutter.KEY_Down) {
            if(posY == childrens.length - 1)
               posY = 0;
            else
               posY += 1;
         }
         else if(symbol == Clutter.KEY_Right) {
            if(posX == childrens[posY].get_children().length - 2)
               posX = 0;
            else
               posX += 2;
         }
         else if(symbol == Clutter.KEY_Left) {
            if(posX == 0)
               posX = childrens[posY].get_children().length - 2;
            else
               posX -= 2;
         }
      }
      let nextItem = null;
      if((childrens[posY])&&(childrens[posY].get_children()[posX]))
         nextItem = childrens[posY].get_children()[posX]
      if((!nextItem)&&(childrens[0])&&(childrens[0].get_children()[0]))
         nextItem = childrens[0].get_children()[0];
      if(nextItem)
         global.stage.set_key_focus(nextItem);
      return nextItem;
   },

   destroy: function() {
      for(let i = 0; i < this.linesDragPlaces.length; i++) {
         this.linesDragPlaces[i].destroy();
      }
      this.actor.destroy();
   }
};

function SystemBox() {
   this._init();
}

SystemBox.prototype = {
   _init: function() {
      this.actor = new St.BoxLayout();
      this.actor._delegate = this;
   },

   destroy: function() {
      this.actor.destroy();
   },
    
   acceptDrop : function(source, actor, x, y, time) {
      if(source instanceof MenuItems.FavoritesButton) {
         source.actor.destroy();
         actor.destroy();
         AppFavorites.getAppFavorites().removeFavorite(source.app.get_id());
         return true;
      }
      return false;
   }
};

function CategoriesBox() {
   this._init.apply(this, arguments);
}

CategoriesBox.prototype = {
   __proto__: ConfigurableMenus.ConfigurablePopupMenuSection.prototype,

   _init: function() {
      ConfigurableMenus.ConfigurablePopupMenuSection.prototype._init.call(this);
      this.scrollBox = new ConfigurableMenus.ScrollItemsBox(this, this.box, true, St.Align.START);
      this.actor = this.scrollBox.actor;
      this.actor.set_style_class_name('menu-categories-box');
      //this.actor.set_vertical(true);
      this.actor.reactive = true;
      this.actor._delegate = this;
   },

   _getVisibleChildren: function() {
      return this.box.get_focus_chain();
      //return this.box.get_children();
            //.filter(x => !(x._delegate instanceof ConfigurablePopupSubMenuMenuItem));
   },

   acceptDrop: function(source, actor, x, y, time) {
      if(source instanceof MenuItems.FavoritesButton) {
         source.actor.destroy();
         actor.destroy();
         AppFavorites.getAppFavorites().removeFavorite(source.app.get_id());
         return true;
      }
      return false;
   },

   getFirstVisible: function() {
      let children = this._getVisibleChildren();
      if(children.length > 0)
         return children[0];
      Main.notify("" + children.length);
      return null;
   },

   isInBorder: function(symbol, actor) {
      let children = this._getVisibleChildren();
      let num = children.length;
      let nColumns = 1;
      if(actor) {
         let index = children.indexOf(actor);
         if(index != -1) {
            let nColumns, nRows, posX, posY;
            if(this.box.get_vertical()) {
                nColumns = 1;
                nRows = Math.floor(num / nColumns);
                posX = index % nColumns;
                posY = Math.floor(index/nColumns);
            } else {
                nRows = 1;
                nColumns = Math.floor(num / nColumns);
                posX = Math.floor(index/nColumns);
                posY = index % nColumns;
            }
            switch(symbol) {
               case Clutter.KEY_Up:
                  return (posy == 0);
               case Clutter.KEY_Down:
                  return (posY == nRows - 1);
               case Clutter.KEY_Right:
                  return (posX == nColumns - 1);
               case Clutter.KEY_Left:
                  return (posX == 0);
            }
         }
      }
      return false;
   },

   navegate: function(symbol, actor) {
      let children = this._getVisibleChildren();
      let num = children.length;
      let nextItem = null;
      if(actor) {
         let index = children.indexOf(actor);
         if(index != -1) {
            let nColumns, nRows, posX, posY;
            if(this.box.get_vertical()) {
                nColumns = 1;
                nRows = Math.floor(num / nColumns);
                posX = index % nColumns;
                posY = Math.floor(index/nColumns);
            } else {
                nRows = 1;
                nColumns = Math.floor(num / nColumns);
                posX = Math.floor(index/nColumns);
                posY = index % nColumns;
            }
            switch(symbol) {
               case Clutter.KEY_Up:
                  posY = (posY == 0) ? nRows - 1 : posY - 1;
                  break;
               case Clutter.KEY_Down:
                  posY = (posY == nRows - 1) ? 0 : posY + 1;
                  break;
               case Clutter.KEY_Right:
                  posX = (posX == nColumns - 1) ? 0 : posX + 1;
                  break;
               case Clutter.KEY_Left:
                  posX = (posX == 0) ? nColumns - 1 : posX - 1;
                  break;
            }
            //Main.notify("bbbb " + index + " " + posX + " " + posY  + " " + nColumns + " " + nRows + " " + num);
            if(posY*nColumns + posX < num)
               nextItem = children[posY*nColumns + posX];
         }
      }
      if(!nextItem && num > 0)
         return children[0];
      return nextItem;
   },

   setVertical: function(vertical) {
      this.box.set_vertical(vertical);
      this.scrollBox.setVertical(vertical);
   },

   getVertical: function(vertical) {
      return this.box.get_vertical();
   },

   scrollToActor: function(actor) {
      this.scrollBox.scrollToActor(actor);
   },

   setAutoScrolling: function(enabled) {
      this.scrollBox.setAutoScrolling(enabled);
   },

   setScrollVisible: function(visible) {
      this.scrollBox.setScrollVisible(visible);
   },

   setFill: function(fill) {
      this.scrollBox.setFill(fill);
   }
};

function ControlBox(parent, iconSize) {
   this._init(parent, iconSize);
}

ControlBox.prototype = {
   _init: function(parent, iconSize) {
      this.parent = parent;
      this.iconSize = iconSize;
      this.actor = new St.BoxLayout({ vertical: false, style_class: 'menu-control-buttons-box' });

      this.resizeBox = new St.BoxLayout({ vertical: false });
      this.bttFullScreen = this._createButton('view-fullscreen');
      this.bttFullScreen.connect('button-press-event', Lang.bind(this, function() {
         this.bttFullScreen.add_style_pseudo_class('pressed');
      }));
      this.bttFullScreen.connect('button-release-event', Lang.bind(this, this._onClickedChangeFullScreen));
      this.resizeBox.add(this.bttFullScreen, { x_fill: false, expand: false });
      this.bttResize = this._createButton('changes-prevent');
      this.bttResize.connect('button-press-event', Lang.bind(this, function() {
         this.bttResize.add_style_pseudo_class('pressed');
      }));
      this.bttResize.connect('button-release-event', Lang.bind(this, this._onClickedChangeResize));
      this.resizeBox.add(this.bttResize, { x_fill: false, expand: false });
      this.bttSettings = this._createButton('preferences-system');
      this.bttSettings.connect('button-press-event', Lang.bind(this, function() {
         this.bttSettings.add_style_pseudo_class('pressed');
      }));
      this.bttSettings.connect('button-release-event', Lang.bind(this, this._onSettings));
      this.resizeBox.add(this.bttSettings, { x_fill: false, x_align: St.Align.END, expand: true });
      this.actor.add(this.resizeBox, { x_fill: true, x_align: St.Align.START, y_align: St.Align.MIDDLE, expand: true });

      this.viewBox = new St.BoxLayout({ vertical: false });
      this.bttViewList = this._createButton('view-list-symbolic');
      this.bttViewList.connect('button-press-event', Lang.bind(this, function() {
         this.bttViewList.add_style_pseudo_class('pressed');
      }));
      this.bttViewList.connect('button-release-event', Lang.bind(this, this._onClickedChangeView));
      this.viewBox.add(this.bttViewList, { x_fill: false, expand: false });
      this.bttViewGrid = this._createButton('view-grid-symbolic');
      this.bttViewGrid.connect('button-press-event', Lang.bind(this, function() {
         this.bttViewGrid.add_style_pseudo_class('pressed');
      }));
      this.bttViewGrid.connect('button-release-event', Lang.bind(this, this._onClickedChangeView));
      this.viewBox.add(this.bttViewGrid, { x_fill: false, expand: false });
      this.actor.add(this.viewBox, { x_fill: false, x_align: St.Align.END, y_align: St.Align.MIDDLE, expand: true });

      this.changeViewSelected(this.parent.iconView);
      this.changeResizeActive(this.parent.controlingSize);
   },

   destroy: function() {
      this.actor.destroy();      
   },

   setSpecialColor: function(specialColor) {
      if(specialColor) {
         this.resizeBox.set_style_class_name('menu-favorites-box');
         this.viewBox.set_style_class_name('menu-favorites-box');
         this.resizeBox.add_style_class_name('menu-control-resize-box');
         this.viewBox.add_style_class_name('menu-control-view-box');
      }
      else {
         this.resizeBox.set_style_class_name('');
         this.viewBox.set_style_class_name('');
      }
   },

   setIconSymbolic: function(iconSymbolic) {
      let iconType;
      if(iconSymbolic)
         iconType = St.IconType.SYMBOLIC;
      else
         iconType = St.IconType.FULLCOLOR;
      let childBox = this.actor.get_children();
      let childBtt;
      for(let i = 0; i < childBox.length; i++) {
         childBtt = childBox[i].get_children();
         for(let j = 0; j < childBtt.length; j++) {
            childBtt[j].get_children()[0].set_icon_type(iconType);
         }
      }
   },

   _onClickedChangeView: function(actor, event) {
      this._effectIcon(actor, 0.2);
      this.bttViewGrid.remove_style_pseudo_class('pressed');
      this.bttViewList.remove_style_pseudo_class('pressed');
      this.changeViewSelected(!this.parent.iconView);
      this.parent._changeView();
   },

   _onClickedChangeResize: function(actor, event) {
      this._effectIcon(actor, 0.2);
      this.bttResize.remove_style_pseudo_class('pressed');
      this.parent.fullScreen = false;
      this.parent.automaticSize = false;
      this.parent._setFullScreen();
      this.changeResizeActive(!this.parent.controlingSize);
      this.parent._updateSize();
   },

   _onClickedChangeFullScreen: function(actor, event) {
      this._effectIcon(actor, 0.2);
      this.bttFullScreen.remove_style_pseudo_class('pressed');
      this.parent.fullScreen = !this.parent.fullScreen;
      this.parent._setFullScreen();
      this.changeFullScreen(this.parent.fullScreen);
   },

   _onSettings: function(actor, event) {
      this.bttSettings.remove_style_pseudo_class('pressed');
      this.parent.menu.close();
      Util.spawn(['cinnamon-settings', 'applets', this.parent.uuid]);
   },

   changeResizeActive: function(resizeActive) {
      this.parent.controlingSize = resizeActive;
      if(resizeActive) {
         this.bttResize.add_style_pseudo_class('open');
         this.bttResize.get_children()[0].set_icon_name('changes-prevent');
         this.parent.menu.setControlingSize(true);
         if(this.parent.appMenu) {
            this.parent.appMenu.setControlingSize(true);
         }
      }
      else {
         this.bttResize.remove_style_pseudo_class('open');
         this.bttResize.get_children()[0].set_icon_name('changes-allow');
         this.parent.menu.setControlingSize(false);
         if(this.parent.appMenu) {
            this.parent.appMenu.setControlingSize(false);
         }
      }
      this.parent.allowResize.setToggleState(resizeActive);
   },

   changeViewSelected: function(iconView) {
      this.parent.iconView = iconView;
      if(iconView) {
         this.bttViewGrid.add_style_pseudo_class('open');
         this.bttViewList.remove_style_pseudo_class('open');
      }
      else {
         this.bttViewList.add_style_pseudo_class('open');
         this.bttViewGrid.remove_style_pseudo_class('open');
      }
      this.parent.listView.setSensitive(iconView);
      this.parent.gridView.setSensitive(!iconView);
   },

   changeFullScreen: function(fullScreen) {
      if(fullScreen) {
         this.bttFullScreen.add_style_pseudo_class('open');
         this.bttFullScreen.get_children()[0].set_icon_name('view-restore');
      }
      else {
         this.bttFullScreen.remove_style_pseudo_class('open')
         this.bttFullScreen.get_children()[0].set_icon_name('view-fullscreen');
         //this.bttFullScreen.get_children()[0].set_icon_name('window-maximize');
      }
      this.parent.fullScreenMenu.setToggleState(fullScreen);
   },

   setIconSize: function(iconSize) {
      let childBox = this.actor.get_children();
      let childBtt;
      for(let i = 0; i < childBox.length; i++) {
         childBtt = childBox[i].get_children();
         for(let j = 0; j < childBtt.length; j++) {
            childBtt[j].get_children()[0].set_icon_size(iconSize);
         }
      }
   },

   _createButton: function(icon) {
      let bttIcon = new St.Icon({icon_name: icon, icon_type: St.IconType.FULLCOLOR,
	                         style_class: 'popup-menu-icon', icon_size: this.iconSize});
      let btt = new St.Button({ child: bttIcon, style_class: 'menu-category-button' });
      btt.add_style_class_name('menu-control-button');
      btt.connect('notify::hover', Lang.bind(this, function(actor) {
         if(!this.parent.actorResize) {
            this.setActive(actor, actor.hover);
            if(actor.get_hover()) {
               switch(actor) {
                  case this.bttViewList:
                     this.parent.selectedAppBox.setSelectedText(_("List View"), _("Show application entries in list view"));
                     break;
                  case this.bttViewGrid:
                     this.parent.selectedAppBox.setSelectedText(_("Grid View"), _("Show application entries in grid view"));
                     break;
                  case this.bttResize:
                     if(this.bttResize.get_children()[0].get_icon_name() == 'changes-prevent')
                        this.parent.selectedAppBox.setSelectedText(_("Prevent resizing"), _("Prevent resizing the menu"));
                     else
                        this.parent.selectedAppBox.setSelectedText(_("Allow resizing"), _("Allow resizing the menu"));
                     break;
                  case this.bttFullScreen:
                     if(this.bttFullScreen.get_children()[0].get_icon_name() == 'window-minimize')
                        this.parent.selectedAppBox.setSelectedText(_("Recover size"), _("Recover the normal menu size"));
                     else
                        this.parent.selectedAppBox.setSelectedText(_("Full Screen"), _("Put the menu in full screen mode"));
                     break;
                  case this.bttSettings:
                     this.parent.selectedAppBox.setSelectedText(_("Configure..."), _("Configure the menu options"));
                     break;
               }
               global.set_cursor(Cinnamon.Cursor.POINTING_HAND);
               actor.set_style_class_name('menu-category-button-selected');
               actor.add_style_class_name('menu-control-button-selected');
            }
            else {
               this.parent.selectedAppBox.setSelectedText("", "");
               global.unset_cursor();
               actor.set_style_class_name('menu-category-button');
               actor.add_style_class_name('menu-control-button');
            }
         }
      }));
      this.actor.connect('key-focus-in', Lang.bind(this, function(actor) {
         this.setActive(actor, true);
      }));
      this.actor.connect('key-focus-out', Lang.bind(this, function(actor) {
         this.setActive(actor, false);
      }));
      return btt;
   },

   setActive: function (actor, active) {
      let activeChanged = active != this.active;
      if(activeChanged) {
         this.active = active;
         if(active) {
            actor.add_style_pseudo_class('active');
            if(this.focusOnHover) this.actor.grab_key_focus();
         } else {
            actor.remove_style_pseudo_class('active');
         }
         //this.emit('active-changed', active);
      }
   },

   navegateControlBox: function(symbol, actor) {
   },

   _effectIcon: function(effectIcon, time) {
      Tweener.addTween(effectIcon,
      {  opacity: 0,
         time: time,
         transition: 'easeInSine',
         onComplete: Lang.bind(this, function() {
            Tweener.addTween(effectIcon,
            {  opacity: 255,
               time: time,
               transition: 'easeInSine'
            });
         })
      });
   }
};

function PowerBox(parent, theme, iconSize) {
   this._init(parent, theme, iconSize);
}

PowerBox.prototype = {
   _init: function(parent, theme, iconSize) {
      this.parent = parent;
      this.iconSize = iconSize;
      this.signalKeyPowerID = 0;
      this.powerSelected = 0;
      this._session = new GnomeSession.SessionManager();
      this._screenSaverProxy = new ScreenSaver.ScreenSaverProxy();

      this.actor = new St.BoxLayout();
      this._powerButtons = new Array();
      this.actor.connect('key-focus-in', Lang.bind(this, function(actor, event) {        
         if(this._powerButtons.length > 0) {
            if((!this.powerSelected)||(this.powerSelected == -1))
               this.powerSelected = 0;
            if(this.activeBar)
               this.powerSelected = 2;
            this._powerButtons[this.powerSelected].setActive(true);
            if(this.signalKeyPowerID == 0)
               this.signalKeyPowerID = this.actor.connect('key-press-event', Lang.bind(this.parent, this.parent._onMenuKeyPress));
         }
      }));
      this.actor.connect('key-focus-out', Lang.bind(this, function(actor, event) {
         for(let cSys in this._powerButtons)
            this._powerButtons[cSys].setActive(false);
         if(this.signalKeyPowerID > 0) {
            this.actor.disconnect(this.signalKeyPowerID);
            this.signalKeyPowerID = 0;
         }
         this.powerSelected = -1;
         if(this._bttChanger)
            this._bttChanger.setActive(false);
      }));
      this.separatorPower = new ConfigurableMenus.ConfigurableSeparatorMenuItem();
      this.separatorPower.setVisible(false);
      this.separatorPower.setSpace(20);
      //Lock screen "preferences-desktop-screensaver"
      let button = new MenuItems.SystemButton(this.parent, null, "system-lock-screen", _("Lock screen"), _("Lock the screen"), this.iconSize, false);
      button.actor.connect('enter-event', Lang.bind(this, this._onEnterEvent));
      button.actor.connect('leave-event', Lang.bind(this, this._onLeaveEvent));
      button.setAction(Lang.bind(this, this._onLockScreenAction));
      button.connect('active-changed', Lang.bind(this, this._onActiveChanged));
      this._powerButtons.push(button);
        
      //Logout button "system-log-out" "system-users" "user-info"
      button = new MenuItems.SystemButton(this.parent, null, "system-log-out", _("Logout"), _("Leave the session"), this.iconSize, false);        
      button.actor.connect('enter-event', Lang.bind(this, this._onEnterEvent));
      button.actor.connect('leave-event', Lang.bind(this, this._onLeaveEvent));
      button.connect('active-changed', Lang.bind(this, this._onActiveChanged));
      button.setAction(Lang.bind(this, this._onLogoutAction));
      button.connect('active-changed', Lang.bind(this, this._onActiveChanged));
      this._powerButtons.push(button);

      //Shutdown button
      button = new MenuItems.SystemButton(this.parent, null, "system-shutdown", _("Quit"), _("Shutdown the computer"), this.iconSize, false);        
      button.actor.connect('enter-event', Lang.bind(this, this._onEnterEvent));
      button.actor.connect('leave-event', Lang.bind(this, this._onLeaveEvent)); 
      button.setAction(Lang.bind(this, this._onShutdownAction));
      button.connect('active-changed', Lang.bind(this, this._onActiveChanged));
      this._powerButtons.push(button);

      this.setTheme(theme);
   },

   _onActiveChanged: function(button, active) {
      this.emit('active-changed', button, active);
   },

   destroy: function(symbolic) {
      this.separatorPower.destroy();
      for(let i = 0; i < this._powerButtons.length; i++) {
         this._powerButtons[i].destroy();
      }
      this.actor.destroy();
   },

   setIconSymbolic: function(symbolic) {
      for(let i = 0; i < this._powerButtons.length; i++) {
         this._powerButtons[i].setIconSymbolic(symbolic);
      }
   },

   setSeparatorSpace: function(space) {
      this.separatorPower.setSpace(space);
   },

   setSeparatorLine: function(haveLine) {
      this.separatorPower.setVisible(haveLine);
   },

   refresh: function() {
      this.setTheme(this.theme);
   },

   setTheme: function(theme) {
      this.theme = theme;
      this._removeButtons();
      switch(this.theme) {
         case "vertical-icon":
            this.actor.set_vertical(true);
            this._setVerticalButtons(true);
            this._insertNormalButtons(St.Align.MIDDLE);
            this._setTextVisible(false);
            this._setIconsVisible(true);
            break;
         case "vertical-list":
            this.actor.set_vertical(true);
            this._setVerticalButtons(false);
            this._insertNormalButtons(St.Align.START);
            this._setTextVisible(true);
            this._setIconsVisible(true);
            break;
         case "vertical-grid":
            this.actor.set_vertical(true);
            this._setVerticalButtons(true);
            this._insertNormalButtons(St.Align.MIDDLE);
            this._setTextVisible(true);
            this._setIconsVisible(true);
            break;
         case "vertical-text":
            this.actor.set_vertical(true);
            this._setVerticalButtons(true);
            this._insertNormalButtons(St.Align.START);
            this._setTextVisible(true);
            this._setIconsVisible(false);
            break;
         case "horizontal-icon":
            this.actor.set_vertical(false);
            this._setVerticalButtons(true);
            this._insertNormalButtons(St.Align.MIDDLE);
            this._setTextVisible(false);
            this._setIconsVisible(true);
            break;
         case "horizontal-list":
            this.actor.set_vertical(false);
            this._setVerticalButtons(false);
            this._insertNormalButtons(St.Align.MIDDLE);
            this._setTextVisible(true);
            this._setIconsVisible(true);
            break;
         case "horizontal-grid":
            this.actor.set_vertical(false);
            this._setVerticalButtons(true);
            this._insertNormalButtons(St.Align.MIDDLE);
            this._setTextVisible(true);
            this._setIconsVisible(true);
            break;
         case "horizontal-text":
            this.actor.set_vertical(false);
            this._setVerticalButtons(false);
            this._insertNormalButtons(St.Align.MIDDLE);
            this._setTextVisible(true);
            this._setIconsVisible(false);

            break;
         case "retractable":
            this.actor.set_vertical(true);
            this._setVerticalButtons(false);
            this._insertRetractableButtons(St.Align.START);
            this._setTextVisible(true);
            this._setIconsVisible(true);
            break;
         case "retractable-text":
            this.actor.set_vertical(true);
            this._setVerticalButtons(false);
            this._insertRetractableButtons(St.Align.START);
            this._setTextVisible(true);
            this._setIconsVisible(false);
            break;
      }
   },

   setSpecialColor: function(specialColor) {
      if(specialColor) {
         this.actor.set_style_class_name('menu-favorites-box');
         this.actor.add_style_class_name('menu-system-with-box-' + this.parent.theme);
      }
      else {
         this.actor.set_style_class_name('menu-system-box-' + this.parent.theme);
      }
   },

   _removeButtons: function() {
      let parentBtt = this.separatorPower.actor.get_parent();
      if(parentBtt)
         parentBtt.remove_actor(this.separatorPower.actor);
      for(let i = 0; i < this._powerButtons.length; i++) {
         parentBtt = this._powerButtons[i].actor.get_parent();
         if(parentBtt)
            parentBtt.remove_actor(this._powerButtons[i].actor);
      }
      this.actor.set_height(-1);
      this.actor.destroy_all_children();
      this.activeBar = null;
      this.separator = null;
   },

   _insertNormalButtons: function(aling) {
      if((this.theme != "horizontal-icon")&&(this.theme != "horizontal-list")&&(this.theme != "horizontal-grid")&&(this.theme != "horizontal-text"))
         this.actor.add_actor(this.separatorPower.actor);
      for(let i = 0; i < this._powerButtons.length; i++) {
         this.actor.add(this._powerButtons[i].actor, { x_fill: true, x_align: aling, expand: true });
         this._powerButtons[i].setTheme(this.theme);
      }
   },

  _insertRetractableButtons: function(aling) {
      this.actor.add_actor(this.separatorPower.actor);
      this.activeBar = new St.BoxLayout({ vertical: false });
      this.separator = new St.BoxLayout({ vertical: true });
      this.separator.style = "padding-left: "+(this.iconSize)+"px;margin:auto;";
      this._bttChanger = new MenuItems.ButtonChangerMenuItem(this.parent, "forward", this.iconSize, ["Show Down", "Options"], 0);
      this._bttChanger.registerCallBack(Lang.bind(this, this._onPowerChange));
      this._bttChanger.setTextVisible(false);
      this.activeBar.add(this._powerButtons[2].actor, { x_fill: false, x_align: aling });
      this.activeBar.add(this._bttChanger.actor, { x_fill: true, x_align: aling });
      this.actor.add(this.activeBar, { x_fill: false, y_fill: false, x_align: aling, y_align: aling, expand: true });
      this.separator.add(this._powerButtons[0].actor, { x_fill: true, x_align: aling, y_align: aling });
      this.separator.add(this._powerButtons[1].actor, { x_fill: true, x_align: aling, y_align: aling });
      this.actor.add(this.separator, { x_fill: false, x_align: aling, y_align: aling, expand: true });
      this._powerButtons[0].setTheme(this.theme);
      this._powerButtons[1].setTheme(this.theme);
      this._powerButtons[2].setTheme(this.theme);
      Mainloop.idle_add(Lang.bind(this, function() {
         this._adjustSize(this._powerButtons[2].actor);
         this._adjustSize(this._powerButtons[1].actor);
         this._adjustSize(this._powerButtons[0].actor);
         this._powerButtons[0].actor.visible = false;
         this._powerButtons[1].actor.visible = false;
      }));
   },

   _adjustSize: function(actor) {
      if(actor.get_width() + this.iconSize + 16 > this.activeBar.get_width()) {
         this.activeBar.set_width(actor.get_width() + this.iconSize + 16);
      }
      if(actor.get_height()*3 + 16 > this.actor.get_height()) {
         this.actor.set_height(actor.get_height()*3 + 16);
      }
   },

  _onPowerChange: function(actor, event) {
     this._powerButtons[0].actor.visible = !this._powerButtons[0].actor.visible;
     this._powerButtons[1].actor.visible = !this._powerButtons[1].actor.visible;
     if(this.powerSelected != -1) {
        this._powerButtons[this.powerSelected].setActive(false);
        this.powerSelected = -1;
        if(this._bttChanger)
           this._bttChanger.setActive(true);
     }
  },

  _setIconsVisible: function(visibleIcon) {
      for(let i = 0; i < this._powerButtons.length; i++) {
         this._powerButtons[i].setIconVisible(visibleIcon);
      }
   },

  _setTextVisible: function(visibleText) {
      for(let i = 0; i < this._powerButtons.length; i++) {
         this._powerButtons[i].setTextVisible(visibleText);
      }
   },

  _setVerticalButtons: function(vertical) {
      for(let i = 0; i < this._powerButtons.length; i++) {
         this._powerButtons[i].setVertical(vertical);
      }
   },

   indexOf: function(actor) {
      for(let sysB in this._powerButtons)
         if(this._powerButtons[sysB].actor == actor)
            return sysB;
      return -1;
   },

   setIconSize: function(iconSize) {
      this.iconSize = iconSize;
      this.actor.set_height(-1);
      if(this._powerButtons) {
         for(let i = 0; i < this._powerButtons.length; i++)
            this._powerButtons[i].setIconSize(this.iconSize);
      } 
      if(this.activeBar) {
         this.separator.style = "padding-left: "+(this.iconSize)+"px;margin:auto;";
         Mainloop.idle_add(Lang.bind(this, function() {
            this._adjustSize(this._powerButtons[0].actor);
            this._adjustSize(this._powerButtons[1].actor);
            this._adjustSize(this._powerButtons[2].actor);
         }));
      }
   },

   _onLockScreenAction: function() {
      if(this.parent.menu.isOpen)
         this.parent.menu.close();
      let screensaver_settings;
      let listShemas = Gio.Settings.list_schemas();
      if(listShemas.indexOf("org.cinnamon.screensaver") != -1)//org.cinnamon.screensaver dosen't exist any more.
         screensaver_settings = new Gio.Settings({ schema: "org.cinnamon.screensaver" });
      else
         screensaver_settings = new Gio.Settings({ schema: "org.cinnamon.desktop.screensaver" });                    
      let screensaver_dialog = Gio.file_new_for_path("/usr/bin/cinnamon-screensaver-command");
      if((screensaver_settings)&&(screensaver_dialog.query_exists(null))) {
         if(screensaver_settings.get_boolean("ask-for-away-message")) {                                    
            Util.spawnCommandLine("cinnamon-screensaver-lock-dialog");
         }
         else {
            Util.spawnCommandLine("cinnamon-screensaver-command --lock");
         }
      }
      else {                
         this._screenSaverProxy.LockRemote();
      }
   },

   _onLogoutAction: function() {
      this.parent.menu.close();
      this._session.LogoutRemote(0);
   },

   _onShutdownAction: function() {
      this.parent.menu.close();
      this._session.ShutdownRemote();
   },

   _onEnterEvent: function(actor, event) {
      if(this.powerSelected != -1)
         this._powerButtons[this.powerSelected].setActive(false);
      this.parent.arrayBoxLayout.scrollBox.setAutoScrolling(false);
      this.parent.categoriesBox.scrollBox.setAutoScrolling(false);
      //this.parent.favoritesScrollBox.setAutoScrolling(false);
      this.parent.arrayBoxLayout.scrollBox.setAutoScrolling(this.parent.autoscroll_enabled);
      this.parent.categoriesBox.scrollBox.setAutoScrolling(this.parent.autoscroll_enabled);
      //this.parent.favoritesScrollBox.setAutoScrolling(this.autoscroll_enabled);
      this.powerSelected = this.indexOf(actor);
      this._powerButtons[this.powerSelected].setActive(true);
      if(this.parent.appMenu) {
         this.parent.appMenu.close();
         this.parent._clearPrevCatSelection();
      }
   },

   _onLeaveEvent: function(actor, event) {
      if(this.powerSelected != -1) {
         this._powerButtons[this.powerSelected].setActive(false);
         this.powerSelected = -1;
      }
   },

   disableSelected: function() {
      if(this.powerSelected != -1) {
         this._powerButtons[this.powerSelected].setActive(false);
         this.powerSelected = -1;
      }
      if((this.activeBar)&&(this._bttChanger))
         this._bttChanger.activateSelected("Show Down");
   },

   navegatePowerBox: function(symbol, actor) {
      if(this.activeBar) {
         if((symbol == Clutter.KEY_Up) || (symbol == Clutter.KEY_Left)) {
            if(this.powerSelected == -1) {
               this._bttChanger.setActive(false);
               this.powerSelected = 2;
               this._powerButtons[this.powerSelected].setActive(true);
            } else if(this.powerSelected == 0) {
               this._powerButtons[this.powerSelected].setActive(false);
               this.powerSelected = -1;
               this._bttChanger.setActive(true);
            } else {
               this._powerButtons[this.powerSelected].setActive(false);
               if(this._powerButtons[this.powerSelected - 1].actor.visible) {
                  this.powerSelected--;
                  this._powerButtons[this.powerSelected].setActive(true);
               } else {
                  this.powerSelected = -1;
                  this._bttChanger.setActive(true);
               }
            }
         }
         else if((symbol == Clutter.KEY_Down) || (symbol == Clutter.KEY_Right)) {
            if(this.powerSelected == -1) {
               this._bttChanger.setActive(false);
               if(this._powerButtons[0].actor.visible)
                  this.powerSelected = 0;
               else
                  this.powerSelected = 2;
               this._powerButtons[this.powerSelected].setActive(true);
            } else if(this.powerSelected == 2) {
               this._powerButtons[this.powerSelected].setActive(false);
               this.powerSelected = -1;
               this._bttChanger.setActive(true);
            } else {
               this._powerButtons[this.powerSelected].setActive(false);
               this.powerSelected++;
               this._powerButtons[this.powerSelected].setActive(true);
            }
         }
         else if((symbol == Clutter.KEY_Return) || (symbol == Clutter.KP_Enter)) {
            if(this.powerSelected != -1) {
               this._powerButtons[this.powerSelected].setActive(false);
               this._powerButtons[this.powerSelected].executeAction();
            } else {
               this._bttChanger.activateNext();
            }
         }
      } else {
         if((symbol == Clutter.KEY_Up) || (symbol == Clutter.KEY_Left)) {
            this._powerButtons[this.powerSelected].setActive(false);
            if(this.powerSelected - 1 < 0)
               this.powerSelected = this._powerButtons.length -1;
            else
               this.powerSelected--;
            this._powerButtons[this.powerSelected].setActive(true);
         }
         else if((symbol == Clutter.KEY_Down) || (symbol == Clutter.KEY_Right)) {
            this._powerButtons[this.powerSelected].setActive(false);
            if(this.powerSelected + 1 < this._powerButtons.length)
               this.powerSelected++;
            else
               this.powerSelected = 0;
            this._powerButtons[this.powerSelected].setActive(true);
         }
         else if((symbol == Clutter.KEY_Return) || (symbol == Clutter.KP_Enter)) {
            this._powerButtons[this.powerSelected].setActive(false);
            this._powerButtons[this.powerSelected].executeAction();
         }
      }
      return true;
   }
};
Signals.addSignalMethods(PowerBox.prototype);

function SelectedAppBox(parent, activeDateTime) {
   this._init(parent, activeDateTime);
}

SelectedAppBox.prototype = {
   _init: function(parent, activeDateTime) {
      this.dateFormat = "%A,%e %B";
      this.timeFormat = "%H:%M";
      this.appDescriptionSize = 6;
      this.appTitleSize = 15;
      this.timeOutDateTime = 0;
      this._parentId = 0;
      this.boxHeightChange = true;
      this.actor = new St.BoxLayout({ style_class: 'menu-selected-app-box', vertical: true });
      this.appTitle = new St.Label({ style_class: 'menu-selected-app-title', text: "" });
      this.appDescription = new St.Label({ style_class: 'menu-selected-app-description', text: "" });
      this.actor.add_actor(this.appTitle);
      this.actor.add_actor(this.appDescription);
      this.actor.connect('parent-set', Lang.bind(this, this._onParentSet));
      this.setDateTimeVisible(activeDateTime);
      this.appTitle.connect('allocation_changed', Lang.bind(this, this._onAllocationChanged));
      this.appDescription.connect('allocation_changed', Lang.bind(this, this._onAllocationChanged));
      this.actor._delegate = this;
   },

   _onParentSet: function(actor, oldParent) {
      if((oldParent)&&(this._parentId != 0))
         oldParent.disconnect(this._parentId);
      this._parentId = 0;
      let parent = this.actor.get_parent();
      if(parent)
         this._parentId = parent.connect("allocation_changed", Lang.bind(this, this._onParentAllocationChanged)); 
   },

   _onParentAllocationChanged: function() {
      let parent = this.actor.get_parent();
      if(parent) {
        let [minWidth, natWidth] = this.actor.get_preferred_width(-1);
        this.actor.style = 'max-width: ' + natWidth + 'px;';
      }
   },

   destroy: function() {
      this.setDateTimeVisible(false);
      if(this.timeOutDateTime > 0) {
         Mainloop.source_remove(this.timeOutDateTime);
         this.timeOutDateTime = 0;
      }
      this.actor.destroy();
   },

   setAlign: function(align) {
      if(align == St.Align.START) {
         this.actor.set_style("text-align: left");
      } else if(align == St.Align.END) {
         this.actor.set_style("text-align: right");
      } else if(align == St.Align.MIDDLE) {
         this.actor.set_style("text-align: center");
      }
      if(this.appTitle.get_parent() == this.actor)
         this.actor.remove_actor(this.appTitle);
      if(this.appDescription.get_parent() == this.actor)
         this.actor.remove_actor(this.appDescription);
      this.actor.add(this.appTitle, {x_fill: true, x_align: align });
      this.actor.add(this.appDescription, {x_fill: true, x_align: align });
   },

   setTitleVisible: function(show) {
      this.appTitle.visible = show;
      this._validateVisible();
   },

   setDescriptionVisible: function(show) {
      this.appDescription.visible = show;
      this._validateVisible();
   },

   setTitleSize: function(size) {
      this.appTitleSize = size;
      this.appTitle.style = "font-size: " + this.appTitleSize + "pt";
      this._validateVisible();
   },

   setDescriptionSize: function(size) {
      this.appDescriptionSize = size;
      this.appDescription.style = "font-size: " + this.appDescriptionSize + "pt";
      this._validateVisible();
   },

   setDateFormat: function(format) {
      this.dateFormat = format;
   },

   setTimeFormat: function(format) {
      this.timeFormat = format;
   },

   setDateTimeVisible: function(visible) {
      this.activeDateTime = visible;
      this.setSelectedText("", "");
   },

   setSelectedText: function(title, description) {
      this.appTitle.set_text(title);
      this.appDescription.set_text(description);
      if((this.activeDateTime)&&(title == "")&&(description == "")) {
         if(this.timeOutDateTime == 0) {
            this.showTime();
            this.timeOutDateTime = Mainloop.timeout_add_seconds(1, Lang.bind(this, this._refrech));
         }
      } else if(this.timeOutDateTime > 0) {
         Mainloop.source_remove(this.timeOutDateTime);
         this.timeOutDateTime = 0;
      }
   },

   _validateVisible: function() {
      if((this.appTitle.visible)||(this.appDescription.visible))
         this.actor.visible = true;
      else
         this.actor.visible = false;
      this.boxHeightChange = true;
      this._onAllocationChanged();
   },

   _onAllocationChanged: function(actor, event) {
      let heightBox = this.actor.get_height();
      let heightLabels = 0;
      if(this.appTitle.visible)
         heightLabels += this.appTitle.get_height();
      if(this.appDescription.visible)
         heightLabels += this.appDescription.get_height();
      if((this.boxHeightChange)||(Math.abs(heightBox - heightLabels) > 10)) {
         if(global.ui_scale)
            this.actor.set_height(heightLabels * global.ui_scale);
         else
            this.actor.set_height(heightLabels);
         this.boxHeightChange = false;
      }
   },

   showTime: function() {
      let displayDate = new Date();
      this.appTitle.set_text(displayDate.toLocaleFormat(this.timeFormat));
      this.appDescription.set_text(displayDate.toLocaleFormat(this.dateFormat));
   },

   _refrech: function() {
      if(this.timeOutDateTime > 0) {
         Mainloop.source_remove(this.timeOutDateTime);
         this.showTime();
         this.timeOutDateTime = Mainloop.timeout_add_seconds(1, Lang.bind(this, this._refrech));
      }
   }
};

function GnoMenuBox(parent, hoverIcon, powerPanel, verticalPanel, iconSize, callBackFun) {
   this._init(parent, hoverIcon, powerPanel, verticalPanel, iconSize, callBackFun);
}

GnoMenuBox.prototype = {
   _init: function(parent, hoverIcon, powerPanel, verticalPanel, iconSize, callBackFun) {
      this.actor = new St.BoxLayout({ vertical: verticalPanel, reactive: true, track_hover: true });
      this.hoverBox = new St.BoxLayout({ vertical: false });
      this.powerBox = new St.BoxLayout({ vertical: verticalPanel });
      this.actor.add_actor(this.hoverBox);
      this.itemsBox = new St.BoxLayout({ vertical: verticalPanel });
      this.scrollActor = new ConfigurableMenus.ScrollItemsBox(parent, this.itemsBox, verticalPanel, St.Align.START);
      this.separatorTop = new ConfigurableMenus.ConfigurableSeparatorMenuItem();
      this.separatorTop.setVisible(false);
      this.separatorTop.setSpace(20);

      this.actor.add_actor(this.separatorTop.actor);
      this.actor.add(this.scrollActor.actor, { x_fill: true, y_fill: true, expand: false});
      this.actor.add(this.powerBox, { x_fill: true, y_fill: true, expand: true });
      this.actor._delegate = this;
      this._gnoMenuSelected = 0;
      this.parent = parent;
      this.hover = hoverIcon;
      this.powerPanel = powerPanel;
      this.vertical = verticalPanel;
      this.iconSize = iconSize;
      this.iconsVisible = true;
      this.callBackFun = callBackFun;
      this._createActionButtons();
      this._insertButtons(St.Align.MIDDLE);
      this.actor.connect('key-focus-in', Lang.bind(this, function(actor, event) {
         this._gnoMenuSelected = 0;
         this._onEnterEvent(this._actionButtons[this._gnoMenuSelected].actor);
      }));
      this.actor.connect('key-focus-out', Lang.bind(this, function(actor, event) {
         this.disableSelected();
      }));
      //this._onEnterEvent(this._actionButtons[this._gnoMenuSelected].actor);
   },

   setVertical: function(vertical) {
      if(vertical != this.actor.get_vertical()) {
         this.actor.set_vertical(vertical);
         this.powerBox.set_vertical(vertical);
         this.itemsBox.set_vertical(vertical);
         this.scrollActor.setVertical(vertical);
      }
   },

   destroy: function() {
      this.separatorTop.destroy();
      for(let i = 0; i < this._actionButtons.length; i++) {
         this._actionButtons[i].destroy();
      }
      this.actor.destroy();
   },
   
   _createActionButtons: function() {
      this._actionButtons = new Array();
      let button = new MenuItems.SystemButton(this.parent, null, "emblem-favorite", _("Favorites"), _("Favorites"), this.iconSize, true);
      //let button = new CategoryButtonExtended(_("Favorites"), this.iconSize, true);
      button.actor.connect('enter-event', Lang.bind(this, this._onEnterEvent));
      button.actor.connect('leave-event', Lang.bind(this, this._onLeaveEvent));
      button.connect('active-changed', Lang.bind(this, this._onActiveChanged));
      //button.setAction(Lang.bind(this, this._changeSelectedButton));
      this.favorites = button;
      this._actionButtons.push(button);
        
      //Logout button  //preferences-other  //emblem-package
      button = new MenuItems.SystemButton(this.parent, null, "preferences-other", _("All Applications"), _("All Applications"), this.iconSize, true);
      button.actor.connect('enter-event', Lang.bind(this, this._onEnterEvent));
      button.actor.connect('leave-event', Lang.bind(this, this._onLeaveEvent));
      button.connect('active-changed', Lang.bind(this, this._onActiveChanged));
      //button.setAction(Lang.bind(this, this._changeSelectedButton));
      this.appList = button;
      this._actionButtons.push(button);

      //Shutdown button
      button = new MenuItems.SystemButton(this.parent, null, "folder", _("Places"), _("Places"), this.iconSize, true);
      button.actor.connect('enter-event', Lang.bind(this, this._onEnterEvent));
      button.actor.connect('leave-event', Lang.bind(this, this._onLeaveEvent));
      button.connect('active-changed', Lang.bind(this, this._onActiveChanged)); 
      //button.setAction(Lang.bind(this, this._changeSelectedButton));
      this.places = button;
      this._actionButtons.push(button);

      //Shutdown button
      button = new MenuItems.SystemButton(this.parent, null, "folder-recent", _("Recent Files"), _("Recent Files"), this.iconSize, false);       
      button.actor.connect('enter-event', Lang.bind(this, this._onEnterEvent));
      button.actor.connect('leave-event', Lang.bind(this, this._onLeaveEvent));
      button.connect('active-changed', Lang.bind(this, this._onActiveChanged)); 
      //button.setAction(Lang.bind(this, this._changeSelectedButton));
      this.recents = button;
      this._actionButtons.push(button);
   },

   _onActiveChanged: function(button, active) {
      this.emit('active-changed', button, active);
   },

   refresh: function() {
      this.setTheme(this.theme);
   },

   _insertButtons: function() {
      let xAling, yAling;
      switch(this.parent.styleGnoMenuPanel.style_class) {
         case 'menu-gno-operative-box-left':
              xAling = St.Align.END;
              yAling = St.Align.END;
              break;
         case 'menu-gno-operative-box-right':
              xAling = St.Align.START;
              yAling = St.Align.END;
              break;
         case 'menu-gno-operative-box-top':
              xAling = St.Align.START;
              yAling = St.Align.END;
              break;
         case 'menu-gno-operative-box-bottom':
              xAling = St.Align.START;
              yAling = St.Align.START;
              break;
      }
      for(let i = 0; i < this._actionButtons.length; i++) {
         this.itemsBox.add(this._actionButtons[i].actor, { x_fill: true, y_fill: false, x_align: xAling, y_align: yAling, expand: true });
         this._setStyleActive(this._actionButtons[i], false);
      }
      this._setStyleActive(this.favorites, true);
   },

   _removeButtons: function() {
      let parentBtt;
      for(let i = 0; i < this._actionButtons.length; i++) {
         parentBtt = this._actionButtons[i].actor.get_parent();
         if(parentBtt)
            parentBtt.remove_actor(this._actionButtons[i].actor);
      }
      this.itemsBox.destroy_all_children();
   },

   setTheme: function(theme) {
      this.theme = theme;
      this._removeButtons();
      switch(theme) {
         case "icon":
            this._setVerticalButtons(false);
            this._insertButtons();
            this._setTextVisible(false);
            this._setIconsVisible(true);
            break;
         case "text":
            this._setVerticalButtons(true);
            this._insertButtons();
            this._setTextVisible(true);
            this._setIconsVisible(false);
            break;
         case "list":
            this._setVerticalButtons(false);
            this._insertButtons();
            this._setTextVisible(true);
            this._setIconsVisible(true);
            break;
         case "grid":
            this._setVerticalButtons(true);
            this._insertButtons();
            this._setTextVisible(true);
            this._setIconsVisible(true);
            break;
      }
   },

   _setIconsVisible: function(visibleIcon) {
      for(let i = 0; i < this._actionButtons.length; i++) {
         this._actionButtons[i].setIconVisible(visibleIcon);
      }
   },

   _setTextVisible: function(visibleText) {
      for(let i = 0; i < this._actionButtons.length; i++) {
         this._actionButtons[i].setTextVisible(visibleText);
      }
   },

   _setVerticalButtons: function(vertical) {
      for(let i = 0; i < this._actionButtons.length; i++) {
         this._actionButtons[i].setVertical(vertical);
      }
   },

   disableSelected: function() {
      this._setStyleActive(this._actionButtons[this._gnoMenuSelected], false);
      this._gnoMenuSelected = 0;
   },

   getSelected: function() {
      return this._actionButtons[this._gnoMenuSelected].title;
   },

   setSelected: function(selected) {
      this._onLeaveEvent(this._actionButtons[this._gnoMenuSelected].actor);
      for(let i = 0; i < this._actionButtons.length; i++) {
         if(this._actionButtons[i].title == selected) {
            this._gnoMenuSelected = i;
            break;
         }
      }
      this._onEnterEvent(this._actionButtons[this._gnoMenuSelected].actor);
   },

   _onEnterEvent: function(actor) {
      this.disableSelected();
      this._gnoMenuSelected = this._actionButtons.indexOf(actor._delegate);
      this._setStyleActive(actor._delegate, true);
      this.callBackFun(actor._delegate.title);
   },

   _setStyleActive: function(button, active) {
      let selected = '';
      if(active)
         selected = '-selected';
      button.setActive(active);
      switch(this.parent.styleGnoMenuPanel.style_class) {
         case 'menu-gno-operative-box-left':
              button.actor.add_style_class_name('menu-gno-button-left' + selected);
              break;
         case 'menu-gno-operative-box-right':
              button.actor.add_style_class_name('menu-gno-button-right' + selected);
              break;
         case 'menu-gno-operative-box-top':
              button.actor.add_style_class_name('menu-gno-button-top' + selected);
              break;
         case 'menu-gno-operative-box-bottom':
              button.actor.add_style_class_name('menu-gno-button-bottom' + selected);
              break;
      }
   },

   _setStyleGreyed: function(button, greyed) {
     let selected = '';
      if(greyed)
         greyed = '-greyed';
      button.actor.set_style_class_name('menu-category-button' + greyed);
      switch(this.parent.styleGnoMenuPanel.style_class) {
         case 'menu-gno-operative-box-left':
              button.actor.add_style_class_name('menu-gno-button-left' + greyed);
              break;
         case 'menu-gno-operative-box-right':
              button.actor.add_style_class_name('menu-gno-button-right' + greyed);
              break;
         case 'menu-gno-operative-box-top':
              button.actor.add_style_class_name('menu-gno-button-top' + greyed);
              break;
         case 'menu-gno-operative-box-bottom':
              button.actor.add_style_class_name('menu-gno-button-bottom' + greyed);
              break;
      }
   },

   _onLeaveEvent: function(actor) {
      this._setStyleActive(actor._delegate, false);
   },

   showFavorites: function(showFavorites) {
      this.favorites.actor.visible = showFavorites;
   },

   showPlaces: function(showPlaces) {
      this.places.actor.visible = showPlaces;
   },

   showRecents: function(showRecent) {
      this.recents.actor.visible = showRecent;
   },

   takeHover: function(take) {
      let parent = this.hover.actor.get_parent();
      if(parent) {
         parent.remove_actor(this.hover.actor);
      }
      if(take) {
         this.hoverBox.add(this.hover.actor, { x_fill: false, x_align: St.Align.MIDDLE, expand: true });
      }
   },

   takePower: function(take) {
      if((take)&&(this.powerBox.get_children().indexOf(this.powerPanel.actor) == -1)) {
         switch(this.parent.styleGnoMenuPanel.style_class) {
            case 'menu-gno-operative-box-left':
                   this.powerBox.set_style_class_name('menu-gno-system-left');
                   break;
            case 'menu-gno-operative-box-right':
                   this.powerBox.set_style_class_name('menu-gno-system-right');
                   break;
            case 'menu-gno-operative-box-top':
                   this.powerBox.set_style_class_name('menu-gno-system-top');
                   break;
            case 'menu-gno-operative-box-bottom':
                   this.powerBox.set_style_class_name('menu-gno-system-bottom');
                   break;
         }
         if(this.powerBox.get_vertical())
            this.powerBox.add(this.powerPanel.actor, { x_fill: false, y_fill: false, x_align: St.Align.MIDDLE, y_align: St.Align.END, expand: true });
         else
            this.powerBox.add(this.powerPanel.actor, { x_fill: false, y_fill: false, x_align: St.Align.END, y_align: St.Align.MIDDLE, expand: true });
      }
      else if(this.powerPanel.actor.get_parent() == this.powerBox) {
         this.powerBox.remove_actor(this.powerPanel.actor);
      }
   },

   setIconSize: function (iconSize) {
      this.iconSize = iconSize;
      for(let i = 0; i < this._actionButtons.length; i++) {
         this._actionButtons[i].setIconSize(iconSize);
      }
   },

   setAutoScrolling: function(autoScroll) {
      this.scrollActor.setAutoScrolling(autoScroll);
   },

   setScrollVisible: function(visible) {
      this.scrollActor.setScrollVisible(visible);
   },

   setSpecialColor: function(specialColor) {
      if(specialColor) {
         this.actor.set_style_class_name('menu-favorites-box');
         this.actor.add_style_class_name('menu-gno-box');
      }
      else {
         this.actor.set_style_class_name('');
      }
   },

   navegateGnoMenuBox: function(symbol, actor) {
      if(this._gnoMenuSelected < this._actionButtons.length) {
         let changerPos = this._gnoMenuSelected;
         this.disableSelected();
         if((symbol == Clutter.KEY_Up) || (symbol == Clutter.KEY_Left)) {
            if(changerPos - 1 < 0)
               this._gnoMenuSelected = this._actionButtons.length - 1;
            else
               this._gnoMenuSelected = changerPos - 1;
         }
         else if((symbol == Clutter.KEY_Down) || (symbol == Clutter.KEY_Right)) {
            if(changerPos + 1 < this._actionButtons.length)
               this._gnoMenuSelected = changerPos + 1;
            else
               this._gnoMenuSelected = 0;
         } else if((symbol == Clutter.KEY_Return) || (symbol == Clutter.KP_Enter)) {
            this.executeButtonAction(changerPos);
         }

      } else if(this._actionButtons.length > 0) {
         this._gnoMenuSelected = 0;
      }
      this.scrollActor.scrollToActor(this._actionButtons[this._gnoMenuSelected].actor);
      this._onEnterEvent(this._actionButtons[this._gnoMenuSelected].actor);
      return true;
   }
};
Signals.addSignalMethods(GnoMenuBox.prototype);

function AccessibleDropBox(parent, place) {
   this._init(parent, place);
}

AccessibleDropBox.prototype = {
   _init: function(parent, place) {
      this.parent = parent;
      this.place = place;
      this.actor = new St.BoxLayout({ vertical: true });
      this.actor._delegate = this;

      this._dragPlaceholder = null;
      this._dragPlaceholderPos = -1;
      this._animatingPlaceholdersCount = 0;
   },

   destroy: function() {
      this.actor.destroy();
   },
    
   _clearDragPlaceholder: function() {
      if(this._dragPlaceholder) {
         this._dragPlaceholder.animateOutAndDestroy();
         this._dragPlaceholder = null;
         this._dragPlaceholderPos = -1;
      }
   },
    
   handleDragOver: function(source, actor, x, y, time) {
    try {
      let currentObj, classType1, classType2;
      if(this.place) {
         currentObj = this.parent.getPlacesList();
         classType1 = MenuItems.PlaceButtonAccessible;
         classType2 = MenuItems.PlaceButton;
      } else {
         currentObj = this.parent.getAppsList();
         classType1 = MenuItems.FavoritesButton;
         classType2 = MenuItems.ApplicationButton;
      }
      let app = source.app;
      let itemPos = currentObj.indexOf(app.get_id());
      // Don't allow favoriting of transient apps
      if(app == null || app.is_window_backed() || ((!(source instanceof classType1)) && (!(source instanceof classType2))))
         return DND.DragMotionResult.NO_DROP;

      let numItems = currentObj.length;

      let children = this.actor.get_children();
      let numChildren = children.length;

      let boxHeight = this.actor.height;


      // Keep the placeholder out of the index calculation; assuming that
      // the remove target has the same size as "normal" items, we don't
      // need to do the same adjustment there.
      if(this._dragPlaceholder) {
         boxHeight -= this._dragPlaceholder.actor.height;
         numChildren--;
      }
      let pos = Math.round(y * numItems / boxHeight);

      if(pos <= numItems) {
        // if(this._animatingPlaceholdersCount > 0) {
        //    let appChildren = children.filter(function(actor) {
        //       return ((actor._delegate instanceof classType1) || (actor._delegate instanceof classType2));
        //    });
        //    this._dragPlaceholderPos = children.indexOf(appChildren[pos]);
        // } else {
            this._dragPlaceholderPos = pos;
        // }

         // Don't allow positioning before or after self
        //   if(itemPos != -1 && (pos == itemPos || pos == itemPos + 1)) {
        //    if(this._dragPlaceholder) {
        //       this._dragPlaceholder.animateOutAndDestroy();
        //       this._animatingPlaceholdersCount++;
        //       this._dragPlaceholder.actor.connect('destroy',
        //          Lang.bind(this, function() {
        //             this._animatingPlaceholdersCount--;
        //          }));
        //    }
        //    this._dragPlaceholder = null;

        //    return DND.DragMotionResult.CONTINUE;
        // }

         // If the placeholder already exists, we just move
         // it, but if we are adding it, expand its size in
         // an animation
         let fadeIn;
         if(this._dragPlaceholder) {
            let parentPlaceHolder = this._dragPlaceholder.actor.get_parent();
            if(parentPlaceHolder) parentPlaceHolder.remove_actor(this._dragPlaceholder.actor);
            this._dragPlaceholder.actor.destroy();
            fadeIn = false;
         } else {
            fadeIn = true;
         }

         this._dragPlaceholder = new DND.GenericDragPlaceholderItem();
         this._dragPlaceholder.child.set_width (source.actor.width);
         this._dragPlaceholder.child.set_height (source.actor.height);
         this.actor.insert_actor(this._dragPlaceholder.actor, 2*this._dragPlaceholderPos);
         if(fadeIn)
            this._dragPlaceholder.animateIn();
      }

      let srcIsCurrentItem = (itemPos != -1);

      if(srcIsCurrentItem)
         return DND.DragMotionResult.MOVE_DROP;

      return DND.DragMotionResult.COPY_DROP;
     } catch(e) {
        Main.notify("Drag and Drop problem:", e.message);
     }
     return DND.DragMotionResult.NO_DROP;
   },
    
   // Draggable target interface
   acceptDrop: function(source, actor, x, y, time) {
      let currentObj, classType1, classType2;
      if(this.place) {
         currentObj = this.parent.getPlacesList();
         classType1 = MenuItems.PlaceButtonAccessible;
         classType2 = MenuItems.PlaceButton;
      } else {
         currentObj = this.parent.getAppsList();
         classType1 = MenuItems.FavoritesButton;
         classType2 = MenuItems.ApplicationButton;
      }

      let app = source.app;

      // Don't allow favoriting of transient apps
      if(app == null || app.is_window_backed() || ((!(source instanceof classType1)) && (!(source instanceof classType2)))) {
         return false;
      }

      let id = app.get_id();

      let itemPos = currentObj.indexOf(app.get_id());
      let srcIsCurrentItem = (itemPos != -1);

      itemPos = this._dragPlaceholderPos;
//       let children = this.actor.get_children();
//         for(let i = 0; i < this._dragPlaceholderPos; i++) {
//            if(this._dragPlaceholder && children[i] == this._dragPlaceholder.actor)
//               continue;
//            
//            if(!(children[i]._delegate instanceof classType1)) continue;
//
//            let childId = children[i]._delegate.app.get_id();
//            if(childId == id)
//               continue;
//            if(currentObj.indexOf(childId) != -1)
//               itemPos++;
//         }

      Meta.later_add(Meta.LaterType.BEFORE_REDRAW, Lang.bind(this, function () {
         if(srcIsCurrentItem) {//moveFavoriteToPos
            currentObj.splice(currentObj.indexOf(app.get_id()), 1);
            currentObj.splice(itemPos, 0, id);
            if(this.place)
               this.parent.setPlacesList(currentObj);
            else
               this.parent.setAppsList(currentObj);
         }
         else {
            currentObj.splice(itemPos, 0, id);
            if(this.place)
               this.parent.setPlacesList(currentObj);
            else
               this.parent.setAppsList(currentObj);
         }
         return false;
      }));

      return true;
   }
};

function AccessibleBox(parent, hoverIcon, selectedAppBox, controlBox, powerBox, vertical, iconSize, showRemovable) {
   this._init(parent, hoverIcon, selectedAppBox, controlBox, powerBox, vertical, iconSize, showRemovable);
}

AccessibleBox.prototype = {
   _init: function(parent, hoverIcon, selectedAppBox, controlBox, powerBox, vertical, iconSize, showRemovable) {
      this.actor = new St.BoxLayout({ vertical: true });
      this.internalBox = new St.BoxLayout({ style_class: 'menu-accessible-panel', vertical: true });
      this.actor.add(this.internalBox, { y_fill: true, expand: true });
      
      this.placeName = new St.Label({ style_class: 'menu-selected-app-title', text: _("Places"), visible: false });
      this.systemName = new St.Label({ style_class: 'menu-selected-app-title', text: _("System"), visible: false });
      this.placeName.style = "font-size: " + 10 + "pt";
      this.systemName.style = "font-size: " + 10 + "pt";
      this.hoverBox = new St.BoxLayout({ vertical: false });
      this.internalBox.add_actor(this.hoverBox);
      this.controlBox = new St.BoxLayout({ vertical: false });
      this.internalBox.add_actor(this.controlBox);
      this.itemsBox = new St.BoxLayout({ vertical: true });
      this.itemsDevices = new St.BoxLayout({ style_class: 'menu-accessible-devices-box', vertical: true });
      this.itemsPlaces = new AccessibleDropBox(parent, true).actor;
      this.itemsPlaces.set_style_class_name('menu-accessible-places-box');
      this.itemsSystem = new AccessibleDropBox(parent, false).actor;
      this.itemsSystem.set_style_class_name('menu-accessible-system-box');
      this.itemsBox.add_actor(this.placeName);
      this.itemsBox.add_actor(this.itemsPlaces);
      this.itemsBox.add_actor(this.itemsDevices);
      this.powerBoxItem = new St.BoxLayout({ vertical: true });
      this.separatorMiddle = new ConfigurableMenus.ConfigurableSeparatorMenuItem();// St.BoxLayout({ vertical: false, height: 20 });
      this.separatorMiddle.setVisible(false);
      this.separatorMiddle.setSpace(20);

      this.itemsBox.add_actor(this.separatorMiddle.actor);
      this.itemsBox.add_actor(this.systemName);
      this.itemsBox.add_actor(this.itemsSystem);
      this.scrollActor = new ConfigurableMenus.ScrollItemsBox(parent, this.itemsBox, true, St.Align.START);
      this.separatorTop = new ConfigurableMenus.ConfigurableSeparatorMenuItem();//St.BoxLayout({ vertical: false, height: 20 });
      this.separatorTop.setVisible(false);
      this.separatorTop.setSpace(20);
      this.internalBox.add_actor(this.separatorTop.actor);
      this.internalBox.add(this.scrollActor.actor, { y_fill: true, expand: true });
      this.internalBox.add(this.powerBoxItem, { y_fill: true, expand: true });
      this.actor._delegate = this;

      this.showRemovable = showRemovable;
      this.idSignalRemovable = 0;
      this._staticSelected = -1;
      this.parent = parent;
      this.hover = hoverIcon;
      this.selectedAppBox = selectedAppBox;
      this.control = controlBox;
      this.powerBox = powerBox;
      this.vertical = vertical;
      this.iconSize = iconSize;
      this.iconsVisible = true;
      this.takingHover = false;
      this.takeHover(true);
      this.takeControl(true);

      this.refreshAccessibleItems();

      this.actor.connect('key-focus-in', Lang.bind(this, function(actor, event) {
         if((this._staticButtons.length > 0)&&(this._staticSelected == -1))
            this._staticSelected = 0;
         this.activeSelected();
      }));
      this.actor.connect('key-focus-out', Lang.bind(this, function(actor, event) {
         this.disableSelected();
      }));
   },

   destroy: function() {
      this.separatorTop.destroy();
      this.separatorMiddle.destroy();
      for(let i = 0; i < this.itemsDevices.length; i++) {
         this.itemsDevices[i].destroy();
      }
      for(let i = 0; i < this._staticButtons.length; i++) {
         this._staticButtons[i].destroy();
      }
      this.itemsPlaces.destroy();
      this.itemsSystem.destroy();
      this.actor.destroy();
   },

   updateVisibility: function() {
      this.hoverBox.visible = this.hover.actor.visible;
      if((!this.hover.actor.visible)&&(!this.control.actor.visible)) {
          this.separatorTop.actor.visible = false;
      } else {
          this.separatorTop.actor.visible = true;
      }
   },

   initItemsRemovables: function() {
      let any = false;
      if(this.showRemovable) {
         try {
            let mounts = Main.placesManager.getMounts();

            let drive;
            for(let i = 0; i < mounts.length; i++) {
               if(mounts[i].isRemovable()) {
                  drive = new MenuItems.DriveMenuItem(this.parent, this.selectedAppBox, this.hover, mounts[i], this.iconSize, this.iconsVisible);
                  this.itemsDevices.add_actor(drive.actor);
                  this._staticButtons.push(drive);
                  any = true;
               }
            }
         } catch(e) {
            global.logError(e);
            Main.notify("ErrorDevice:", e.message);
         }
         if(this.idSignalRemovable == 0)
            this.idSignalRemovable = Main.placesManager.connect('mounts-updated', Lang.bind(this, this.refreshAccessibleItems));
      } else {
         if(this.idSignalRemovable > 0) {
            Main.placesManager.disconnect(this.idSignalRemovable);
            this.idSignalRemovable = 0;
         }
      }
      this.itemsDevices.visible = any;
   },

   showRemovableDrives: function(showRemovable) {
      if(this.showRemovable != showRemovable) {
         this.showRemovable = showRemovable;
         this.refreshAccessibleItems();
      }
   },

   setSeparatorSpace: function(space) {
      this.separatorMiddle.setSpace(space);
      this.separatorTop.setSpace(space);
   },

   setSeparatorLine: function(haveLine) {
      this.separatorMiddle.setVisible(haveLine);
      this.separatorTop.setVisible(haveLine);
   },

   setNamesVisible: function(visible) {
      this.placeName.visible = true;
      this.systemName.visible = true;
   },

   setIconsVisible: function(visible) {
      this.iconsVisible = visible;
      for(let i = 0; i < this._staticButtons.length; i++) {
         this._staticButtons[i].setIconVisible(visible);
      }
   },

   setSpecialColor: function(specialColor) {
      if(specialColor) {
         this.actor.set_style_class_name('menu-favorites-box');
         this.actor.add_style_class_name('menu-accessible-box');
      }
      else
         this.actor.set_style_class_name('');
   },

   acceptDrop: function(source, actor, x, y, time) {
      if(source instanceof MenuItems.FavoritesButton) {
         source.actor.destroy();
         actor.destroy();
         AppFavorites.getAppFavorites().removeFavorite(source.app.get_id());
         return true;
      }
      return false;
   },

  // closeContextMenus: function(excludeApp, animate) {
  //    for(let app in this._staticButtons) {
  //       if((app!=excludeApp)&&(this._staticButtons[app].menu)&&(this._staticButtons[app].menu.isOpen)) {
  //          if(animate)
  //             this._staticButtons[app].toggleMenu();
  //          else
  //             this._staticButtons[app].closeMenu();
  //       }
  //    }
  // },

   takeHover: function(take) {
      let parent = this.hover.actor.get_parent();
      if(parent) {
         parent.remove_actor(this.hover.actor);
      }
      if(take) {
         this.hoverBox.add(this.hover.actor, { x_fill: false, x_align: St.Align.MIDDLE, expand: true });
         this.hoverBox.set_style("padding-top: 10px; padding-bottom: 10px;");
      } else {
         this.hoverBox.set_style("padding-top: 0px; padding-bottom: 0px;");
      }
      this.hoverBox.visible = take;
   },

   takeControl: function(take) {
      if(take) {
         this.controlBox.add(this.control.actor, { x_fill: true, x_align: St.Align.MIDDLE, expand: true });
      }
      else if(this.control.actor.get_parent() == this.controlBox) {
         this.controlBox.remove_actor(this.control.actor);
      }
   },

   takePower: function(take) {
      if(take) {
         if(this.powerBoxItem.get_children().indexOf(this.powerBox.actor) == -1)
            this.powerBoxItem.add(this.powerBox.actor, { x_fill: true, y_fill: false, x_align: St.Align.MIDDLE, y_align: St.Align.END, expand: true });
      }
      else if(this.powerBox.actor.get_parent() == this.powerBoxItem) {
         this.powerBoxItem.remove_actor(this.powerBox.actor);
      }
   },

   setAutoScrolling: function(autoScroll) {
      this.scrollActor.setAutoScrolling(autoScroll);
   },

   setScrollVisible: function(visible) {
      this.scrollActor.setScrollVisible(visible);
   },

   getFirstElement: function() {
      let childrens = this.internalBox.get_children();
      if(childrens.length > 0) {
         return childrens[0];
      }
      return null;
   },

   getBookmarkById: function(listBookmarks, id) {
      for(let i = 0; i < listBookmarks.length; i++) {
         if(listBookmarks[i].id == id) {
            return listBookmarks[i];
         }
      }
      return null;
   },

   refreshAccessibleItems: function() {
      if(this._staticButtons) {
         for(let i = 0; i < this._staticButtons.length; i++) {
            this._staticButtons[i].actor.destroy();
         }
         this.itemsPlaces.destroy_all_children();
         this.itemsSystem.destroy_all_children();
         this.itemsDevices.destroy_all_children();
      }
      this._staticButtons = new Array();
      this.initItemsPlaces();
      this.initItemsRemovables();
      this.initItemsSystem();
      this.setIconsVisible(this.iconsVisible);
      this.parent._updateSize();
   },

   initItemsPlaces: function() {
     try {
      let listBookmarks = this.parent._listBookmarks();
      let placesList = this.parent.getPlacesList();
      let placesName = this.parent.getPlacesNamesList();
      let currBookmark, menuItemPlace;
      for(let i = 0; i < placesList.length; i++) {
         if(placesList[i] != "") {
            currBookmark = this.getBookmarkById(listBookmarks, placesList[i]);
            menuItemPlace = new MenuItems.PlaceButtonAccessible(this.parent, this.scrollActor, currBookmark, placesName[placesList[i]], false,
                                                     this.iconSize, this.textButtonWidth, this.appButtonDescription);
            menuItemPlace.actor.connect('enter-event', Lang.bind(this, this._appEnterEvent, menuItemPlace));
            //menuItemPlace.connect('enter-event', Lang.bind(this, this._appEnterEvent, menuItemPlace));
            menuItemPlace.actor.connect('leave-event', Lang.bind(this, this._appLeaveEvent, menuItemPlace));
            this.itemsPlaces.add_actor(menuItemPlace.actor);
            //if(item.menu)
               this.itemsPlaces.add_actor(menuItemPlace.menu.actor);
            //else {//Remplace menu actor by a hide false actor.
            //   falseActor = new St.BoxLayout();
            //   falseActor.hide();
            //   this.itemsPlaces.add_actor(falseActor);
            //}
            this._staticButtons.push(menuItemPlace);
         }
      }
    } catch(e) {
      Main.notify("Errttt", e.message);
    }
   },

   initItemsSystem: function() {
      let appSys = Cinnamon.AppSystem.get_default();
      let appsList = this.parent.getAppsList();
      for(let i = 0; i < appsList.length; i++) {
         if(appsList[i] != "") {
            this._createApp(appSys, appsList[i]);
         }
      }
   },

   setIconSize: function (iconSize) {
      this.iconSize = iconSize;
      for(let i = 0; i < this._staticButtons.length; i++) {
         this._staticButtons[i].setIconSize(iconSize);
      }
   },

   _createApp: function(appSys, appName) {
      let iconSizeDrag = 32;
      let app = appSys.lookup_app(appName);
      let appsName = this.parent.getAppsNamesList();
      if(app) {
         let menuItemFav = new MenuItems.FavoritesButton(this.parent, this.scrollActor, this.vertical, true, app, appsName[app.get_id()],
                                                4, this.iconSize, true, this.textButtonWidth, this.appButtonDescription, this._applicationsBoxWidth);
         menuItemFav.actor.connect('enter-event', Lang.bind(this, this._appEnterEvent, menuItemFav));
         menuItemFav.actor.connect('leave-event', Lang.bind(this, this._appLeaveEvent, menuItemFav));
         menuItemFav.actor.set_style_class_name('menu-application-button');
         this.itemsSystem.add_actor(menuItemFav.actor);
         this.itemsSystem.add_actor(menuItemFav.menu.actor);
         this._staticButtons.push(menuItemFav);
      }
   },

   disableSelected: function() {
      if((this._staticSelected != -1)&&(this._staticSelected < this._staticButtons.length)) {
         let selectedBtt = this._staticButtons[this._staticSelected];
         selectedBtt.actor.style_class = "menu-application-button";
      }
      this.selectedAppBox.setSelectedText("", "");
      this.hover.refreshFace();
   },

   activeSelected: function() {
      if((this._staticSelected != -1)&&(this._staticSelected < this._staticButtons.length)) {
         let selectedBtt = this._staticButtons[this._staticSelected];
         selectedBtt.actor.style_class = "menu-application-button-selected";
         if(selectedBtt.app.get_description())
            this.selectedAppBox.setSelectedText(selectedBtt.app.get_name(), selectedBtt.app.get_description().split("\n")[0]);
         else
            this.selectedAppBox.setSelectedText(selectedBtt.app.get_name(), "");
         this.hover.refreshApp(selectedBtt.app);
      } else {
         this.selectedAppBox.setSelectedText("", "");
         this.hover.refreshFace();
         this._staticSelected = -1;
      }
   },

   executeButtonAction: function(buttonIndex) {
      if((buttonIndex != -1)&&(buttonIndex < this._staticButtons.length)) {
         this._staticButtons[buttonIndex].actor._delegate.activate();
      }
   },

   navegateAccessibleBox: function(symbol, actor) {
      if((this._staticSelected != -1)&&(this._staticSelected < this._staticButtons.length)) {
         let changerPos = this._staticSelected;
         this.disableSelected();
         if((symbol == Clutter.KEY_Up) || (symbol == Clutter.KEY_Left)) {
            if(changerPos - 1 < 0)
               this._staticSelected = this._staticButtons.length - 1;
            else
               this._staticSelected = changerPos - 1;
         }
         else if((symbol == Clutter.KEY_Down) || (symbol == Clutter.KEY_Right)) {
            if(changerPos + 1 < this._staticButtons.length)
               this._staticSelected = changerPos + 1;
            else
               this._staticSelected = 0;
         } else if((symbol == Clutter.KEY_Return) || (symbol == Clutter.KP_Enter)) {
            this.executeButtonAction(changerPos);
         }

      } else if(this._staticButtons.length > 0) {
         this._staticSelected = 0;
      }
      this.scrollActor.scrollToActor(this._staticButtons[this._staticSelected].actor);
      this.activeSelected();
      return true;
   },

   _appEnterEvent: function(actor, event, applicationButton) {
      this.disableSelected();
      this._staticSelected = this._staticButtons.indexOf(applicationButton);
      this.activeSelected();
   },

   _appLeaveEvent: function(actor, event, applicationButton) {
      this.disableSelected();
   }
};
