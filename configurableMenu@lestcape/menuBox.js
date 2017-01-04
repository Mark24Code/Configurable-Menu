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

function PlacesGnomeBox() {
   this._init.apply(this, arguments);
}

PlacesGnomeBox.prototype = {
   __proto__: ConfigurableMenus.ConfigurablePopupMenuSection.prototype,

   _init: function(parent, selectedAppBox, hover, iconSize, iconView, textButtonWidth) {
      ConfigurableMenus.ConfigurablePopupMenuSection.prototype._init.call(this);
      this.parent = parent;
      this.selectedAppBox = selectedAppBox;
      this.hover = hover;
      this.iconSize = iconSize;
      this.iconView = iconView;
      this.textButtonWidh = textButtonWidth;
      this.appButtonDescription = this.appButtonDescription;

      this.actor = new St.BoxLayout({ vertical: true, style_class: 'menu-accessible-box' });
      this.scrollActor = new ConfigurableMenus.ScrollItemsBox(this, this.box, true, St.Align.START);
      this.actor.add(this.scrollActor.actor, { y_fill: true, expand: true });

      this._listPlaces = new Array();
      Main.placesManager.connect('mounts-updated', Lang.bind(this, this._refreshMount));
      this.refreshPlaces();
   },

   refreshPlaces: function() {
      this.box.destroy_all_children();

      this.specialPlaces = new ConfigurableMenus.ConfigurablePopupMenuSection();
      this._addPlaces(this.specialPlaces, this.parent._listSpecialBookmarks());
      this.addMenuItem(this.specialPlaces, {x_fill: true, expand: true});

      this.separator1 = new ConfigurableMenus.ConfigurableSeparatorMenuItem();
      this.separator1.setVisible(true);
      this.separator1.setSpace(20);
      this.addMenuItem(this.separator1);

      this.bookmarksPlaces = new ConfigurableMenus.ConfigurablePopupMenuSection();
      this._addPlaces(this.bookmarksPlaces, Main.placesManager.getBookmarks());
      this.addMenuItem(this.bookmarksPlaces, {x_fill: true, expand: true});

      this.separator2 = new ConfigurableMenus.ConfigurableSeparatorMenuItem();
      this.separator2.setVisible(true);
      this.separator2.setSpace(20);
      this.addMenuItem(this.separator2);

      this.removablePlaces = new ConfigurableMenus.ConfigurablePopupMenuSection();
      this.addMenuItem(this.removablePlaces, {x_fill: true, expand: true});

      this._refreshMount();
   },

   _addPlaces: function(box, places) {
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
         this._listPlaces.push(button);
         box.addMenuItem(button, {x_fill: true, expand: true});
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
      let placesChilds = this.removablePlaces.getMenuItems();
      this.removablePlaces.removeAllMenuItems();
      for(let i = 0; i < placesChilds.length; i++) {
         for(let j = 0; j < this._listPlaces.length; j++) {
            if(this._listPlaces[j].actor == placesChilds[i].actor) {
               this._listPlaces.splice(j,1);
               break;
            }
         }
         placesChilds[i].destroy();
      }
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
               this.removablePlaces.addMenuItem(drive);
               this._listPlaces.push(drive);
            }
         }

      } catch(e) {
         global.logError(e);
         Main.notify("ErrorDevice:", e.message);
      }
   },

   destroy: function() {
      this.separator1.destroy();
      this.separator2.destroy();
      for(let i = 0; i < this._listPlaces.length; i++) {
         this._listPlaces[i].destroy();
      }
      this.actor.destroy();
   },
};

function FavoritesBoxLine() {
   this._init.apply(this, arguments);
}

FavoritesBoxLine.prototype = {
   __proto__: ConfigurableMenus.ConfigurablePopupMenuSection.prototype,

   _init: function(parentBox, vertical) {
      ConfigurableMenus.ConfigurablePopupMenuSection.prototype._init.call(this);
      this.parentBox = parentBox;
      this.vertical = vertical;
      this.actor.vertical = vertical;
      this.actor._delegate = this;
        
      this._dragPlaceholder = null;
      this._dragPlaceholderPos = -1;
      this._animatingPlaceholdersCount = 0;
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

         Meta.later_add(Meta.LaterType.BEFORE_REDRAW, Lang.bind(this, function() {
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
      this._firstElement = null;
      this.scrollBox = new ConfigurableMenus.ScrollItemsBox(this, this.box, vertical, St.Align.START);
      this.actor = this.scrollBox.actor;
      this.actor._delegate = this;
      this.linesDragPlaces = new Array();
      let internalLine;
      for(let i = 0; i < numberLines; i++) {
         internalLine = new FavoritesBoxLine(this, !vertical);
         this.linesDragPlaces.push(internalLine);
         ConfigurableMenus.ConfigurablePopupMenuSection.prototype.addMenuItem.call( this, internalLine, {
             x_align: St.Align.MIDDLE, y_align: St.Align.START, x_fill: false, y_fill: false, expand: true
         });
      }
      //Important!!! this only work in that way:
      this.box.set_vertical(false);
      this.setVertical(vertical);
   },

   _onKeyFocusChanged: function() {
      let focusedActor = global.stage.get_key_focus();
   },

   _navegateFocusOut: function(actor) {
      let focus = global.stage.get_key_focus();
      if(actor.contains(focus)) {
         this.actor.grab_key_focus();
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
      for(let i = 0; i < this.linesDragPlaces.length; i++) {
         childrens = this.linesDragPlaces[i].getMenuItems();
         for(let j = 0; j < childrens.length; j++) {
            this.linesDragPlaces[i].removeItem(childrens[j]);
         }
      }
      let internalLine;
      for(let i = this.linesDragPlaces.length; i < numberLines; i++) {
         internalLine = new FavoritesBoxLine(this, this.isVertical());
         this.linesDragPlaces.push(internalLine);
         ConfigurableMenus.ConfigurablePopupMenuSection.prototype.addMenuItem.call( this, internalLine, {
             x_align: St.Align.MIDDLE, y_align: St.Align.START, x_fill: false, y_fill: false, expand: true
         });
      }
      let lastPos = this.linesDragPlaces.length;
      while(numberLines < lastPos) {
         lastPos--;
         this.linesDragPlaces[lastPos].destroy();
         this.linesDragPlaces.splice(lastPos, 1);
      }
   },

   setVertical: function(vertical) {
      if(vertical != this.isVertical()) {
         this.scrollBox.setVertical(vertical);
         for(let i = 0; i < this.linesDragPlaces.length; i++) {
            this.linesDragPlaces[i].setVertical(vertical);
         }
      }
   },

   isVertical: function() {
      return this.scrollBox.actor.get_vertical();
   },

   getRealSpace: function() {
      let result = 0;
      let childrens = this.box.get_children();
      for(let i = 0; i < childrens.length; i++)
         result += childrens[i].get_height();
      return result;
   },

   addMenuItem: function(menuItem, params, position) {
      try {
         if(!this._firstElement) {
            this._firstElement = menuItem.actor;
            this._firstElement.connect('key-focus-in', Lang.bind(this, function(actor, event) {
               this.activeHoverElement(actor);
            }));
         }
         let childrens = this.box.get_children();
         let currentNumberItems = childrens[0].get_children().length;
         for(let i = 1; i < childrens.length; i++) {
            if(currentNumberItems > childrens[i].get_children().length) {
               childrens[i]._delegate.addMenuItem(menuItem, params);
               currentNumberItems--; 
               break;
            }
         }
         if(currentNumberItems == childrens[0].get_children().length)
            childrens[0]._delegate.addMenuItem(menuItem, params);
      
      } catch(e) {
         Main.notify("Favorite add element error", e.message);
      }
   },

   destroyAllMenuItems: function() {
      try {
         this._firstElement = null;
         if(this._dragPlaceholder) {
            let parentHolder = this._dragPlaceholder.actor.get_parent();
            if(parentHolder) {
               this._navegateFocusOut(this._dragPlaceholder.actor);
               this._dragPlaceholder.actor.destroy();
            }
            this._dragPlaceholder = null;
         }

         //Remove all favorites and release the focus if is necessary.
         for(let i = 0; i < this.linesDragPlaces.length; i++) {
            this._navegateFocusOut(this.linesDragPlaces[i].actor);
            this.linesDragPlaces[i].destroy();
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
   this._init.apply(this, arguments);
}

SystemBox.prototype = {
   __proto__: ConfigurableMenus.ConfigurablePopupMenuSection.prototype,

   _init: function() {
      ConfigurableMenus.ConfigurablePopupMenuSection.prototype._init.call(this);
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

function ControlBox() {
   this._init.apply(this, arguments);
}

ControlBox.prototype = {
   __proto__: ConfigurableMenus.ConfigurablePopupMenuSection.prototype,

   _init: function(parent, iconSize) {
      ConfigurableMenus.ConfigurablePopupMenuSection.prototype._init.call(this);
      this.actor.vertical = false;
      this.actor.style_class = 'menu-control-buttons-box';
      this.parent = parent;
      this.iconSize = iconSize;
      //this.actor = new St.BoxLayout({ vertical: false, style_class: 'menu-control-buttons-box' });

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

   setActive: function(actor, active) {
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

function PowerBox() {
   this._init.apply(this, arguments);
}

PowerBox.prototype = {
   __proto__: ConfigurableMenus.ConfigurablePopupMenuSection.prototype,

   _init: function(parent, theme, iconSize) {
      ConfigurableMenus.ConfigurablePopupMenuSection.prototype._init.call(this);
      this.parent = parent;
      this.iconSize = iconSize;
      this.signalKeyPowerID = 0;
      this.powerSelected = 0;
      this._session = new GnomeSession.SessionManager();
      this._screenSaverProxy = new ScreenSaver.ScreenSaverProxy();
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
      this._separatorPower = new ConfigurableMenus.ConfigurableSeparatorMenuItem();
      this._separatorPower.setVisible(false);
      this._separatorPower.setSpace(20);
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

      this._activeBar = new ConfigurableMenus.ConfigurablePopupMenuSection();
      this._activeBar.setVertical(false);

      this._bttChanger = new MenuItems.ButtonChangerMenuItem(this.parent, "forward", this.iconSize, ["Show Down", "Options"], 0);
      this._bttChanger.registerCallBack(Lang.bind(this, this._onPowerChange));
      this._bttChanger.setTextVisible(false);
      this._separatorBox = new ConfigurableMenus.ConfigurablePopupMenuSection();
      this._separatorBox.setVertical(true);

      this.setTheme(theme);
   },

   _onActiveChanged: function(button, active) {
      //this.emit('active-changed', button, active);
   },

   setIconSymbolic: function(symbolic) {
      for(let i = 0; i < this._powerButtons.length; i++) {
         this._powerButtons[i].setIconSymbolic(symbolic);
      }
   },

   setSeparatorSpace: function(space) {
      this._separatorPower.setSpace(space);
   },

   setSeparatorLine: function(haveLine) {
      this._separatorPower.setVisible(haveLine);
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
            this.setIconVisible(true);
            break;
         case "vertical-list":
            this.actor.set_vertical(true);
            this._setVerticalButtons(false);
            this._insertNormalButtons(St.Align.START);
            this._setTextVisible(true);
            this.setIconVisible(true);
            break;
         case "vertical-grid":
            this.actor.set_vertical(true);
            this._setVerticalButtons(true);
            this._insertNormalButtons(St.Align.MIDDLE);
            this._setTextVisible(true);
            this.setIconVisible(true);
            break;
         case "vertical-text":
            this.actor.set_vertical(true);
            this._setVerticalButtons(true);
            this._insertNormalButtons(St.Align.START);
            this._setTextVisible(true);
            this.setIconVisible(false);
            break;
         case "horizontal-icon":
            this.actor.set_vertical(false);
            this._setVerticalButtons(true);
            this._insertNormalButtons(St.Align.MIDDLE);
            this._setTextVisible(false);
            this.setIconVisible(true);
            break;
         case "horizontal-list":
            this.actor.set_vertical(false);
            this._setVerticalButtons(false);
            this._insertNormalButtons(St.Align.MIDDLE);
            this._setTextVisible(true);
            this.setIconVisible(true);
            break;
         case "horizontal-grid":
            this.actor.set_vertical(false);
            this._setVerticalButtons(true);
            this._insertNormalButtons(St.Align.MIDDLE);
            this._setTextVisible(true);
            this.setIconVisible(true);
            break;
         case "horizontal-text":
            this.actor.set_vertical(false);
            this._setVerticalButtons(false);
            this._insertNormalButtons(St.Align.MIDDLE);
            this._setTextVisible(true);
            this.setIconVisible(false);

            break;
         case "retractable":
            this.actor.set_vertical(true);
            this._setVerticalButtons(false);
            this._insertRetractableButtons(St.Align.START);
            this._setTextVisible(true);
            this.setIconVisible(true);
            break;
         case "retractable-text":
            this.actor.set_vertical(true);
            this._setVerticalButtons(false);
            this._insertRetractableButtons(St.Align.START);
            this._setTextVisible(true);
            this.setIconVisible(false);
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
      this.removeMenuItem(this._separatorPower);
      for(let i = 0; i < this._powerButtons.length; i++) {
         this._powerButtons[i].removeFromParentContainer();
      }
      this.actor.set_height(-1);

      this._activeBar.removeMenuItem(this._bttChanger);

      this.removeMenuItem(this._activeBar);
      this.removeMenuItem(this._separatorBox);
   },

   _insertNormalButtons: function(aling) {
      if((this.theme != "horizontal-icon")&&(this.theme != "horizontal-list")&&(this.theme != "horizontal-grid")&&(this.theme != "horizontal-text"))
         this.addMenuItem(this._separatorPower);
      for(let i = 0; i < this._powerButtons.length; i++) {
         this.addMenuItem(this._powerButtons[i], { x_fill: true, x_align: aling, expand: true });
         this._powerButtons[i].setTheme(this.theme);
      }
   },

  _insertRetractableButtons: function(aling) {
      this.addMenuItem(this._separatorPower);
      this._separatorBox.actor.style = "padding-left: "+(this.iconSize)+"px;margin:auto;";

      this._activeBar.addMenuItem(this._powerButtons[2], { x_fill: false, x_align: aling });

      this._activeBar.addMenuItem(this._bttChanger, { x_fill: true, x_align: aling });

      this.addMenuItem(this._activeBar, { x_fill: false, y_fill: false, x_align: aling, y_align: aling, expand: true });
      this._separatorBox.addMenuItem(this._powerButtons[0], { x_fill: true, x_align: aling, y_align: aling });
      this._separatorBox.addMenuItem(this._powerButtons[1], { x_fill: true, x_align: aling, y_align: aling });
      this.addMenuItem(this._separatorBox, { x_fill: false, x_align: aling, y_align: aling, expand: true });
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
      if(actor.get_width() + this.iconSize + 16 > this._activeBar.actor.get_width()) {
         this._activeBar.actor.set_width(actor.get_width() + this.iconSize + 16);
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

   setIconVisible: function(show) {
      for(let i = 0; i < this._powerButtons.length; i++) {
         this._powerButtons[i].setIconVisible(show);
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
      if(this._activeBar) {
         this._separatorBox.actor.style = "padding-left: "+(this.iconSize)+"px;margin:auto;";
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
      if((this._activeBar)&&(this._bttChanger))
         this._bttChanger.activateSelected("Show Down");
   },

   navegatePowerBox: function(symbol, actor) {
      if(this._activeBar) {
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
         } else if((symbol == Clutter.KEY_Down) || (symbol == Clutter.KEY_Right)) {
            this._powerButtons[this.powerSelected].setActive(false);
            if(this.powerSelected + 1 < this._powerButtons.length)
               this.powerSelected++;
            else
               this.powerSelected = 0;
            this._powerButtons[this.powerSelected].setActive(true);
         } else if((symbol == Clutter.KEY_Return) || (symbol == Clutter.KP_Enter)) {
            this._powerButtons[this.powerSelected].setActive(false);
            this._powerButtons[this.powerSelected].executeAction();
         }
      }
      return true;
   },

   destroy: function(parent, activeDateTime) {
      this._separatorPower.destroy();
      this._separatorBox.destroy();
      this._activeBar.destroy();
      this.actor.destroy();
      this.emit('destroy');
   },
};
Signals.addSignalMethods(PowerBox.prototype);

function SelectedAppBox() {
   this._init.apply(this, arguments);
}

SelectedAppBox.prototype = {
   __proto__: ConfigurableMenus.ConfigurablePopupMenuSection.prototype,

   _init: function(parent, activeDateTime) {
      ConfigurableMenus.ConfigurablePopupMenuSection.prototype._init.call(this);
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

function GnoMenuBox() {
   this._init.apply(this, arguments);
}

GnoMenuBox.prototype = {
   __proto__: ConfigurableMenus.ConfigurablePopupMenuSection.prototype,

   _init: function(parent, hoverIcon, powerPanel, verticalPanel, iconSize, callBackFun) {
      ConfigurableMenus.ConfigurablePopupMenuSection.prototype._init.call(this);
      this.setVertical(verticalPanel);
      this.actor.reactive = true;
      this.actor.track_hover = true;
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
  /*     this.actor.connect('key-focus-in', Lang.bind(this, function(actor, event) {
         this._gnoMenuSelected = 0;
         this._onEnterEvent(this._actionButtons[this._gnoMenuSelected].actor);
      }));
      this.actor.connect('key-focus-out', Lang.bind(this, function(actor, event) {
         this.disableSelected();
      }));
      //this._onEnterEvent(this._actionButtons[this._gnoMenuSelected].actor);*/
   },

   setVertical: function(vertical) {
      if(vertical != this.actor.get_vertical()) {
         this.actor.set_vertical(vertical);
         this.powerBox.set_vertical(vertical);
         this.itemsBox.set_vertical(vertical);
         this.scrollActor.setVertical(vertical);
      }
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
      //this.emit('active-changed', button, active);
   },

   refresh: function() {
      this.setTheme(this.theme);
   },

   _insertButtons: function() {
      let xAling, yAling;
      switch(this.parent.styleGnoMenuPanel.actor.style_class) {
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
            this.setIconVisible(true);
            break;
         case "text":
            this._setVerticalButtons(true);
            this._insertButtons();
            this._setTextVisible(true);
            this.setIconVisible(false);
            break;
         case "list":
            this._setVerticalButtons(false);
            this._insertButtons();
            this._setTextVisible(true);
            this.setIconVisible(true);
            break;
         case "grid":
            this._setVerticalButtons(true);
            this._insertButtons();
            this._setTextVisible(true);
            this.setIconVisible(true);
            break;
      }
   },

   setIconVisible: function(show) {
      for(let i = 0; i < this._actionButtons.length; i++) {
         this._actionButtons[i].setIconVisible(show);
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
      switch(this.parent.styleGnoMenuPanel.actor.style_class) {
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
      switch(this.parent.styleGnoMenuPanel.actor.style_class) {
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
         switch(this.parent.styleGnoMenuPanel.actor.style_class) {
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

   setIconSize: function(iconSize) {
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
   },

   destroy: function() {
      this.separatorTop.destroy();
      for(let i = 0; i < this._actionButtons.length; i++) {
         this._actionButtons[i].destroy();
      }
      this.actor.destroy();
   },
};
Signals.addSignalMethods(GnoMenuBox.prototype);

function MenuItemsDropBox() {
   this._init.apply(this, arguments);
}

MenuItemsDropBox.prototype = {
   __proto__: ConfigurableMenus.ConfigurablePopupMenuBox.prototype,

   _init: function(label) {
      ConfigurableMenus.ConfigurablePopupMenuBox.prototype._init.call(this, label);
      this.actor._delegate = this;

      this._dragPlaceholder = null;
      this._dragPlaceholderPos = -1;
      this._animatingPlaceholdersCount = 0;
      this.allowedClassList = [];
      this.deniedClassList = [];
   },

   addMenuItem: function(menuItem, params, position) {
      if(menuItem.get_id) {
         ConfigurableMenus.ConfigurablePopupMenuBox.prototype.addMenuItem.call(this, menuItem, params, position);
      } else
         throw TypeError("Invalid argument to ConfigurablePopupMenuBase.addMenuItem()");
   },

   getIdList: function() {
      let idList = new Array();
      let items = this.getMenuItems();
      for(let pos in items) {
         idList.push(items[pos].get_id());
      }
      return idList;
   },

   setAllowedClass: function(itemClass) {
      this.allowedClassList.push(itemClass);
   },

   setDeniedClass: function(itemClass) {
      this.deniedClassList.push(itemClass);
   },
    
   _clearDragPlaceholder: function() {
      if(this._dragPlaceholder) {
         this._dragPlaceholder.animateOutAndDestroy();
         this._dragPlaceholder = null;
         this._dragPlaceholderPos = -1;
      }
   },

   _isAllowedClass: function(item) {
       if(this.allowedClassList.length == 0)
          return true;
       for(let pos in this.allowedClassList) {
           if(item instanceof this.allowedClassList[pos])
              return true;
       }
       return false;
   },

   _isDeniedClass: function(item) {
       if(this.deniedClassList.length == 0)
          return false;
       for(let pos in this.deniedClassList) {
           if(item instanceof this.deniedClassList[pos])
              return true;
       }
       return false;
   },
    
   handleDragOver: function(source, actor, x, y, time) {
    try {
      if(!(source.get_id) || this._isDeniedClass(source) || !this._isAllowedClass(source))
         return DND.DragMotionResult.NO_DROP;

      let id = source.get_id();
      let idList = this.getIdList();
      let itemPos = idList.indexOf(id);

      let numItems = idList.length;
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
         this._dragPlaceholderPos = pos;
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
         this.box.insert_actor(this._dragPlaceholder.actor, 2*(this._dragPlaceholderPos));
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
      if(!(source.get_id) || this._isDeniedClass(source) || !this._isAllowedClass(source)) {
         this._clearDragPlaceholder();
         return false;
      }

      let id = source.get_id();
      let idList = this.getIdList();
      let itemPos = idList.indexOf(id);
      let srcIsCurrentItem = (itemPos != -1);

      itemPos = this._dragPlaceholderPos;

      Meta.later_add(Meta.LaterType.BEFORE_REDRAW, Lang.bind(this, function() {
         if(srcIsCurrentItem) {
            idList.splice(idList.indexOf(id), 1);
            idList.splice(itemPos, 0, id);
            this.emit('current-list-changed', idList);
         } else {
            idList.splice(itemPos, 0, id);
            this.emit('current-list-changed', idList);
         }
         this._clearDragPlaceholder();
         return false;
      }));

      return true;
   }
};

function PlacesBox() {
   this._init.apply(this, arguments);
}

PlacesBox.prototype = {
   __proto__: MenuItemsDropBox.prototype,

   _init: function(label) {
      MenuItemsDropBox.prototype._init.call(this, label);
      this.actor._delegate = this;
      this.allowedClassList.push(MenuItems.PlaceButton);
      this.allowedClassList.push(MenuItems.PlaceButtonAccessible);
   },

   addMenuItem: function(menuItem, params, position) {
      if(menuItem.app && !menuItem.get_id) {
         menuItem.get_id = Lang.bind(this, function() {
            return menuItem.app.get_id();
         });
      }
      MenuItemsDropBox.prototype.addMenuItem.call(this, menuItem, params, position);
   },

   setIconSize: function(iconSize) {
      let items = this.getMenuItems();
      for(let pos in items) {
         if(items[pos].setIconSize) {
            items[pos].setIconSize(iconSize);
         }
      }
   },
};

function ApplicationsBox() {
   this._init.apply(this, arguments);
}

ApplicationsBox.prototype = {
   __proto__: MenuItemsDropBox.prototype,

   _init: function(label) {
      MenuItemsDropBox.prototype._init.call(this, label);
      this.actor._delegate = this;
      this.allowedClassList.push(MenuItems.ApplicationButton);
      this.allowedClassList.push(MenuItems.FavoritesButton);
   },

   addMenuItem: function(menuItem, params, position) {
      if(menuItem.app && !menuItem.get_id) {
         menuItem.get_id = Lang.bind(this, function() {
            return menuItem.app.get_id();
         });
      }
      MenuItemsDropBox.prototype.addMenuItem.call(this, menuItem, params, position);
   },

   setIconSize: function(iconSize) {
      let items = this.getMenuItems();
      for(let pos in items) {
         if(items[pos].setIconSize) {
            items[pos].setIconSize(iconSize);
         }
      }
   },
};

function DevicesBox() {
   this._init.apply(this, arguments);
}

DevicesBox.prototype = {
   __proto__: ConfigurableMenus.ConfigurablePopupMenuSection.prototype,

   _init: function(parent, selectedAppBox, hover) {
      ConfigurableMenus.ConfigurablePopupMenuSection.prototype._init.call(this);
      this.actor.style_class = 'menu-accessible-devices-box';
      this.idSignalRemovable = 0;
      this.showRemovable = false;
      this.iconsVisible = false;
      this.iconSize = 20;
      this.hover = hover;
      this.selectedAppBox = selectedAppBox;
   },

   showIcons: function(show) {
      this.iconsVisible = show;
   },

   setIconSize: function(size) {
      this.iconSize = size;
   },

   showRemovable: function(show) {
      if(this.showRemovable != show) {
         this.showRemovable = show;
         this.refresh();
         if(show) {
            if(this.idSignalRemovable == 0)
               this.idSignalRemovable = Main.placesManager.connect('mounts-updated', Lang.bind(this, this.refresh));
         } else {
            if(this.idSignalRemovable > 0) {
               Main.placesManager.disconnect(this.idSignalRemovable);
               this.idSignalRemovable = 0;
            }
         }
      }
   },

   refresh: function() {
      let any = false;
      this.destroyAllMenuItems();
      if(this.showRemovable) {
         try {
            let mounts = Main.placesManager.getMounts();
            let drive;
            for(let i = 0; i < mounts.length; i++) {
               if(mounts[i].isRemovable()) {
                  drive = new MenuItems.DriveMenuItem(this.selectedAppBox, this.hover, mounts[i], this.iconSize, this.iconsVisible);
                  drive.connect('activate',  Lang.bind(this, function(drive, event, keepMenu) {
                     this.emit('activate', event, keepMenu);
                  }));
                  this.addMenuItem(drive);
                  any = true;
               }
            }
         } catch(e) {
            global.logError(e);
            Main.notify("ErrorDevice:", e.message);
         }
      }
      this.actor.visible = any;
   },
};
Signals.addSignalMethods(DevicesBox.prototype);

function AccessibleBox() {
   this._init.apply(this, arguments);
}

AccessibleBox.prototype = {
   __proto__: ConfigurableMenus.ConfigurablePopupMenuSection.prototype,

   _init: function(parent, hoverIcon, selectedAppBox, controlBox, powerBox, vertical, iconSize, showRemovable) {
      ConfigurableMenus.ConfigurablePopupMenuSection.prototype._init.call(this);
      this.actor = new St.BoxLayout({ vertical: true, style_class: 'menu-accessible-box' });

      this.hoverBox = new ConfigurableMenus.ConfigurablePopupMenuSection();
      this.hoverBox.setVertical(false);
      this.actor.add(this.hoverBox.actor);
      this.controlBox = new ConfigurableMenus.ConfigurablePopupMenuSection();
      this.controlBox.setVertical(false);
      this.actor.add(this.controlBox.actor);

      this.scrollActor = new ConfigurableMenus.ScrollItemsBox(parent, this.box, true, St.Align.START);
      this.actor.add(this.scrollActor.actor, { y_fill: true, expand: true });

      this.itemsDevices = new DevicesBox();
      this.itemsDevices.actor.set_style_class_name('menu-accessible-devices-box');
      this.itemsDevices.connect('activate',  Lang.bind(this, function(devices, event, keepMenu) {
         this.emit('activate', event, keepMenu);
      }));

      this.itemsPlaces = new PlacesBox(_("Places"));//new AccessibleDropBox(parent, _("Places"), true);
      this.itemsPlaces.actor.set_style_class_name('menu-accessible-places-box');
      this.itemsPlaces.setLabelStyle('menu-selected-app-title');
      this.itemsPlaces.setLabelVisible(false);
      this.itemsPlaces.connect('current-list-changed', Lang.bind(this, function(places, list) {
         this.parent.setPlacesList(list);
      }));

      this.itemsApplications = new ApplicationsBox(_("System"));//new AccessibleDropBox(parent, _("System"), false);
      this.itemsApplications.actor.set_style_class_name('menu-accessible-system-box');
      this.itemsApplications.setLabelStyle('menu-selected-app-title');
      this.itemsApplications.setLabelVisible(false);
      this.itemsApplications.connect('current-list-changed', Lang.bind(this, function(apps, list) {
         this.parent.setAppsList(list);
      }));

      this.separatorTop = new ConfigurableMenus.ConfigurableSeparatorMenuItem();
      this.separatorTop.setVisible(false);
      this.separatorTop.setSpace(20);

      this.separatorMiddle = new ConfigurableMenus.ConfigurableSeparatorMenuItem();
      this.separatorMiddle.setVisible(false);
      this.separatorMiddle.setSpace(20);

      this.addMenuItem(this.itemsPlaces);
      this.addMenuItem(this.itemsDevices);
      this.addMenuItem(this.separatorTop);
      this.addMenuItem(this.itemsApplications);
      this.addMenuItem(this.separatorMiddle);

      this.powerBox = new ConfigurableMenus.ConfigurablePopupMenuSection();
      this.powerBox.setVertical(true);
      this.actor.add(this.powerBox.actor, { y_fill: true, expand: true });

      this.actor._delegate = this;

      this.idSignalRemovable = 0;
      this._staticSelected = -1;
      this.parent = parent;
      this.hover = hoverIcon;
      this.selectedAppBox = selectedAppBox;
      this.control = controlBox;
      this.power = powerBox;
      this.vertical = vertical;
      this.iconSize = iconSize;
      this.iconsVisible = true;
      this.refreshAccessibleItems();

      this.actor.connect('key-focus-in', Lang.bind(this, function(actor, event) {
         if((this.getItems().length > 0)&&(this._staticSelected == -1))
            this._staticSelected = 0;
         this.activeSelected();
      }));
      this.actor.connect('key-focus-out', Lang.bind(this, function(actor, event) {
         this.disableSelected();
      }));
   },

   getItems: function() {
      let buttoms = new Array();
      let items = this.itemsPlaces.getMenuItems();
      for(let pos in items)
         buttoms.push(items[pos]);
      items = this.itemsApplications.getMenuItems();
      for(let pos in items)
         buttoms.push(items[pos]);
      return buttoms;
   },

   destroy: function() {
      this.separatorTop.destroy();
      this.separatorMiddle.destroy();
      this.itemsDevices.destroy();
      this.itemsPlaces.destroy();
      this.itemsApplications.destroy();
      this.actor.destroy();
   },

   updateVisibility: function() {
      this.hoverBox.actor.visible = this.hover.actor.visible;
      if((!this.hover.actor.visible)&&(!this.control.actor.visible)) {
          this.separatorTop.actor.visible = false;
      } else {
          this.separatorTop.actor.visible = true;
      }
   },

   showRemovableDrives: function(show) {
      //this.itemsDevices.showRemovable(show);
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
      this.itemsPlaces.setLabelVisible(visible);
      this.itemsApplications.setLabelVisible(visible);
   },

   setIconVisible: function(show) {
      if(this.iconsVisible != show) {
         this.iconsVisible = show;
         ConfigurableMenus.ConfigurablePopupMenuSection.prototype.setIconVisible.call(this, show);
      }
   },

   setSpecialColor: function(specialColor) {
      if(specialColor) {
         this.actor.set_style_class_name('menu-accessible-box');
         this.actor.add_style_class_name('menu-favorites-box');
      }
      else
         this.actor.set_style_class_name('menu-accessible-box');
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
  //    let buttoms = this.getItems();
  //    for(let pos in buttoms) {
  //       if((app!=excludeApp)&&(buttoms[pos].menu)&&(buttoms[pos].menu.isOpen)) {
  //          if(animate)
  //             buttoms[pos].toggleMenu();
  //          else
  //             buttoms[pos].closeMenu();
  //       }
  //    }
  // },

   takeHover: function(take) {
      this.hover.removeFromParentContainer();
      if(take) {
         this.hoverBox.addMenuItem(this.hover, { x_fill: false, x_align: St.Align.MIDDLE, expand: true });
         this.hoverBox.actor.set_style("padding-top: 10px; padding-bottom: 10px;");
      } else {
         this.hoverBox.actor.set_style("padding-top: 0px; padding-bottom: 0px;");
      }
      this.hoverBox.visible = take;
   },

   takeControl: function(take) {
      this.control.removeFromParentContainer();
      if(take) {
         this.controlBox.addMenuItem(this.control, { x_fill: true, x_align: St.Align.MIDDLE, expand: true });
      }
   },

   takePower: function(take) {
      this.power.removeFromParentContainer();
      if(take) {
         this.powerBox.addMenuItem(this.power, { x_fill: true, y_fill: false, x_align: St.Align.MIDDLE, y_align: St.Align.END, expand: true });
      }
   },

   setAutoScrolling: function(autoScroll) {
      this.scrollActor.setAutoScrolling(autoScroll);
   },

   setScrollVisible: function(visible) {
      this.scrollActor.setScrollVisible(visible);
   },

   getFirstElement: function() {
      let childrens = this.actor.get_children();
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
      this.itemsPlaces.destroyAllMenuItems();
      this.itemsApplications.destroyAllMenuItems();

      this.initItemsPlaces();
      //this.itemsDevices.refresh();
      this.initItemsSystem();
      this.setIconVisible(this.iconsVisible);
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
            this.itemsPlaces.addMenuItem(menuItemPlace);
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

   setIconSize: function(iconSize) {
      if(this.iconSize != iconSize) {
         this.iconSize = iconSize;
         this.itemsPlaces.setIconSize(iconSize);
         this.itemsApplications.setIconSize(iconSize);
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
         this.itemsApplications.addMenuItem(menuItemFav);
      }
   },

   disableSelected: function() {
      let buttoms = this.getItems();
      if((this._staticSelected != -1)&&(this._staticSelected < buttoms.length)) {
         let selectedBtt = buttoms[this._staticSelected];
         selectedBtt.actor.style_class = "menu-application-button";
      }
      this.selectedAppBox.setSelectedText("", "");
      this.hover.refreshFace();
   },

   activeSelected: function() {
      let buttoms = this.getItems();
      if((this._staticSelected != -1)&&(this._staticSelected < buttoms.length)) {
         let selectedBtt = buttoms[this._staticSelected];
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
      let buttoms = this.getItems();
      if((buttonIndex != -1)&&(buttonIndex < buttoms.length)) {
         buttoms[buttonIndex].actor._delegate.activate();
      }
   },

   navegateAccessibleBox: function(symbol, actor) {
      let buttoms = this.getItems();
      if((this._staticSelected != -1)&&(this._staticSelected < buttoms.length)) {
         let changerPos = this._staticSelected;
         this.disableSelected();
         if((symbol == Clutter.KEY_Up) || (symbol == Clutter.KEY_Left)) {
            if(changerPos - 1 < 0)
               this._staticSelected = buttoms.length - 1;
            else
               this._staticSelected = changerPos - 1;
         }
         else if((symbol == Clutter.KEY_Down) || (symbol == Clutter.KEY_Right)) {
            if(changerPos + 1 < buttoms.length)
               this._staticSelected = changerPos + 1;
            else
               this._staticSelected = 0;
         } else if((symbol == Clutter.KEY_Return) || (symbol == Clutter.KP_Enter)) {
            this.executeButtonAction(changerPos);
         }

      } else if(buttoms.length > 0) {
         this._staticSelected = 0;
      }
      this.scrollActor.scrollToActor(buttoms[this._staticSelected].actor);
      this.activeSelected();
      return true;
   },

   _appEnterEvent: function(actor, event, applicationButton) {
      this.disableSelected();
      let buttoms = this.getItems();
      this._staticSelected = buttoms.indexOf(applicationButton);
      this.activeSelected();
   },

   _appLeaveEvent: function(actor, event, applicationButton) {
      this.disableSelected();
   }
};
Signals.addSignalMethods(AccessibleBox.prototype);
