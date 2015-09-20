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
const Cinnamon = imports.gi.Cinnamon;
const Clutter = imports.gi.Clutter;
const AccountsService = imports.gi.AccountsService;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const DND = imports.ui.dnd;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const AppFavorites = imports.ui.appFavorites;
const GnomeSession = imports.misc.gnomeSession;
const ScreenSaver = imports.misc.screenSaver;

const AppletPath = imports.ui.appletManager.applets['configurableMenu@lestcape'];
const ConfigurableScrolls = AppletPath.configurableScrolls;
const MenuItems = AppletPath.menuItems;
//MenuBox

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
      this.separator1 = new MenuBox.SeparatorBox(true, 20);
      this.actor.add_actor(this.separator1.actor);
      this.bookmarksPlaces = new St.BoxLayout({ vertical: true });
      this._addPlaces(this.bookmarksPlaces, Main.placesManager.getBookmarks());
      this.actor.add(this.bookmarksPlaces, {x_fill: true, expand: true});
      this.separator2 = new MenuBox.SeparatorBox(true, 20);
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
            this.parentBox._onDragPlaceholderChange(this._dragPlaceholder);
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

function FavoritesBoxExtended(parent, vertical, numberLines) {
   this._init(parent, vertical, numberLines);
}

FavoritesBoxExtended.prototype = {
   _init: function(parent, vertical, numberLines) {
      this.parent = parent;
      this.favRefresh = true;
      this.actor = new St.BoxLayout();
      this.actor.set_vertical(!vertical);
      //this.actor._delegate = this;
      this.linesDragPlaces = new Array();
      let internalLine;
      for(let i = 0; i < numberLines; i++) {
         internalLine = new FavoritesBoxLine(this, vertical);
         this.linesDragPlaces.push(internalLine);
         this.actor.add(internalLine.actor, { x_align: St.Align.MIDDLE, y_align: St.Align.START, x_fill: true, y_fill: false, expand: true });
      }
      this.firstElement = null;
      this.setVertical(vertical);
   },

   destroy: function() {
      for(let i = 0; i < this.linesDragPlaces.length; i++) {
         this.linesDragPlaces[i].destroy();
      }
      this.actor.destroy();
   },

   _onDragPlaceholderChange: function(dragPlaceholder) {
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
      let childrens = this.actor.get_children();
      let childrensItems;
      for(let i = 0; i < childrens.length; i++) {
         childrensItems = childrens[i].get_children();
         for(let j = 0; j < childrensItems.length; j++) {
            childrensItems[j].remove_style_pseudo_class('hover');
         }
      }
      if(actor) {
         actor.add_style_pseudo_class('hover');
         this.parent.favoritesScrollBox.scrollToActor(actor);
      }
   },

   getNumberLines: function() {
      return this.linesDragPlaces.length;
   },

   getBeginPosAtLine: function(line, itemPos) {
      this.favRefresh = false;
      let sumOfElements = 0;
      if(itemPos > 0)
         sumOfElements += this.linesDragPlaces.length*(itemPos);
      return sumOfElements + this.linesDragPlaces.indexOf(line);
   },

   needRefresh: function() {
      return this.favRefresh;
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
         internalLine = new FavoritesBoxLine(this, this.isVertical);
         this.linesDragPlaces.push(internalLine);
         this.actor.add(internalLine.actor, { x_align: St.Align.MIDDLE, y_align: St.Align.START, x_fill: true, y_fill: false, expand: true });
      }
      let lastPos = this.linesDragPlaces.length;
      while(numberLines < lastPos) {
         lastPos--;
         if(this.linesDragPlaces[lastPos].actor.get_parent() == this.actor)
            this.actor.remove_actor(this.linesDragPlaces[lastPos].actor);
         this.linesDragPlaces[lastPos].actor.destroy();
         this.linesDragPlaces.splice(lastPos, 1);
      }
      for(let i = 0; i < saveItems.length; i++) {
         this.add(saveItems[i]);
      }
      //Main.notify("chil:" + this.actor.get_children().length + " line:" + this.linesDragPlaces.length);
   },

   setVertical: function(vertical) {
      this.isVertical = vertical;
      this.actor.set_vertical(!vertical);
      let childrens = this.actor.get_children();
      for(let i = 0; i < childrens.length; i++) {
         childrens[i].set_vertical(vertical);
      }
   },

   getFirstElement: function() {
     // let childrens = this.actor.get_children();
     // if(childrens.length > 0) {
     //    let childrensItems = childrens[0].get_children();
     //    if(childrensItems.length > 0)
     //       return childrensItems[0];
     // }
     // return null;
      return this.firstElement;
   },

   getVertical: function() {
      return this.isVertical;
   },

   getRealSpace: function() {
      let result = 0;
      let childrens = this.actor.get_children();
      for(let i = 0; i < childrens.length; i++)
         result += childrens[i].get_height();
      return result;
   },

   add: function(actor, menu, properties) {
      try {
         if(!this.firstElement) {
            this.firstElement = actor;
            this.firstElement.connect('key-focus-in', Lang.bind(this, function(actor, event) {
               this.activeHoverElement(actor);
            }));
         }
         let childrens = this.actor.get_children();
         let currentNumberItems = childrens[0].get_children().length;
         for(let i = 1; i < childrens.length; i++) {
            if(currentNumberItems > childrens[i].get_children().length) {
               this._addInCorrectBox(childrens[i], actor, menu, properties);
               currentNumberItems--; 
               break;
            }
         }
         if(currentNumberItems == childrens[0].get_children().length)
            this._addInCorrectBox(childrens[0], actor, menu, properties);
      
      } catch(e) {
         Main.notify("Favorite add element error", e.message);
      }
   },

   _addInCorrectBox: function(box, actor, menu, properties) {
      box.add(actor, properties);
      box.add_actor(menu.actor);
   },

   removeAll: function() {
      try {
         this.firstElement = null;
         let parentPlaceHolder;
         for(let i = 0; i < this.linesDragPlaces.length; i++) {
            this.linesDragPlaces[i].visible = false;
            parentPlaceHolder = this.linesDragPlaces[i].actor.get_parent();
            if(parentPlaceHolder == this.actor)
               this.actor.remove_actor(this.linesDragPlaces[i].actor);
         }
         this.oldLines = this.linesDragPlaces;
         this.linesDragPlaces = new Array();

         Mainloop.idle_add(Lang.bind(this, function() {
            if(this._dragPlaceholder) {
               let parentHolder = this._dragPlaceholder.actor.get_parent();
               if(parentHolder)
                  parentHolder.remove_actor(this._dragPlaceholder.actor);
               this._dragPlaceholder = null;
            }
            this.favRefresh = true;
            //Remove all favorites
            let childrens;
            if(this.oldLines) {
               let  lastPos = this.oldLines.length;
               while(0 < lastPos) {
                  lastPos--;
                  //this.actor.remove_actor(this.linesDragPlaces[lastPos].actor);
                  this.oldLines[lastPos].actor.get_children().forEach(Lang.bind(this, function (child) {
                     child.destroy();
                  }));
                  this.oldLines[lastPos].actor.destroy();
                  //this.oldLines.splice(lastPos, 1);
               }
               this.oldLines = null;
            }
         }));
      } catch(e) {
         Main.notify("Favorite remove element error", e.message);
      }
   },

   _generateChildrenList: function() {
      let result = new Array();
      let childrens = this.actor.get_children();
      let childrensItems;
      for(let i = 0; i < childrens.length; i++) {
         childrensItems = childrens[i].get_children();
         for(let j = 0; j < childrensItems.length; j++) {
            result.push(childrensItems[j]);
         }
      }
      return result;
   },

   isInBorder: function(symbol, actor) {
      let childrens = this.actor.get_children();
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
         return (((this.isVertical)&&(posY == 0))||((!this.isVertical)&&(posX == 0)));
      if(symbol == Clutter.KEY_Right)
         return (((this.isVertical)&&(posY == childrens.length - 1))||((!this.isVertical)&&(posX == childrens[posY].get_children().length - 2)));
      if(symbol == Clutter.KEY_Down) {
         return (((this.isVertical)&&(posX  == childrens[posY].get_children().length - 2))||((!this.isVertical)&&(posY == childrens.length - 1)));
      }
      if(symbol == Clutter.KEY_Up)
         return (((this.isVertical)&&(posX == 0))||((!this.isVertical)&&(posY == 0)));
      return false;
   },

   navegateFavBox: function(symbol, actor) {
      let childrens = this.actor.get_children();
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
      if(this.isVertical) {
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
   }
};

function SeparatorBox(haveLine, space) {
   this._init(haveLine, space);
}

SeparatorBox.prototype = {
   _init: function(haveLine, space) {
      this.actor = new St.BoxLayout({ vertical: true });
      this.separatorLine = new PopupMenu.PopupSeparatorMenuItem();
      this.actor.add_actor(this.separatorLine.actor);
      this.setLineVisible(haveLine);
      this.setSpace(space);
   },

   destroy: function() {
     this.separatorLine.destroy();
     this.actor.destroy();
   },

   setSpace: function(space) {
      this.space = space;
      if(this.actor.get_vertical()) {
         this.actor.set_width(-1);
         this.actor.set_height(space);
      } else {
         this.actor.set_width(space);
         this.actor.set_height(-1);
      }
   },

   setLineVisible: function(show) {
      this.haveLine = show;
      this.separatorLine.actor.visible = show;
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

function HoverIconBox(parent, iconSize) {
   this._init(parent, iconSize);
}

HoverIconBox.prototype = {
   __proto__: PopupMenu.PopupSubMenuMenuItem.prototype,
    
   _init: function(parent, iconSize) {
      PopupMenu.PopupBaseMenuItem.prototype._init.call(this, {hover: false, focusOnHover: false });
      try {
         //this.actor._delegate = this;
         this.parent = parent;
         this.iconSize = iconSize;

         this.container = new St.BoxLayout({ vertical: false });
         this.container.add_actor(this.actor);

         this.actor.set_height(this.iconSize);
         this._userIcon = new St.Icon({ icon_size: this.iconSize });
         this.icon = new St.Icon({ icon_size: this.iconSize, icon_type: St.IconType.FULLCOLOR });
         
         this.menu = new PopupMenu.PopupSubMenu(this.actor);
         this.container.add_actor(this.menu.actor);
         this.menu.actor.set_style_class_name('menu-context-menu');
         this.menu.connect('open-state-changed', Lang.bind(this, this._subMenuOpenStateChanged));

         this._user = AccountsService.UserManager.get_default().get_user(GLib.get_user_name());
         this._userLoadedId = this._user.connect('notify::is_loaded', Lang.bind(this, this._onUserChanged));
         this._userChangedId = this._user.connect('changed', Lang.bind(this, this._onUserChanged));

         let menuItem;
         let userBox = new St.BoxLayout({ style_class: 'user-box', vertical: false });
         this.userLabel = new St.Label();//{ style_class: 'user-label' });
         userBox.add(this.userLabel, { x_fill: false, y_fill: false, x_align: St.Align.START, y_align: St.Align.MIDDLE, expand: true });
         this.menu.addActor(userBox);

         this.notificationsSwitch = new PopupMenu.PopupSwitchMenuItem(_("Notifications"), this._toggleNotifications, { focusOnHover: false });
         this.notificationsSwitch.actor.style = "padding-top: "+(2)+"px;padding-bottom: "+(2)+"px;padding-left: "+(1)+"px;padding-right: "+(1)+"px;margin:auto;";
         this.menu.addMenuItem(this.notificationsSwitch);
         global.settings.connect('changed::display-notifications', Lang.bind(this, function() {
            this.notificationsSwitch.setToggleState(global.settings.get_boolean("display-notifications"));
         }));
         this.notificationsSwitch.connect('toggled', Lang.bind(this, function() {
            global.settings.set_boolean("display-notifications", this.notificationsSwitch.state);
         }));

         this.account = new PopupMenu.PopupMenuItem(_("Account Details"), { focusOnHover: false });
         this.account.actor.style = "padding-top: "+(2)+"px;padding-bottom: "+(2)+"px;padding-left: "+(1)+"px;padding-right: "+(1)+"px;margin:auto;";
         this.menu.addMenuItem(this.account);
         this.account.connect('activate', Lang.bind(this, function() {
            Util.spawnCommandLine("cinnamon-settings user");
         }));

         this._onUserChanged();
         this.refreshFace();
         this.actor.style = "padding-top: "+(0)+"px;padding-bottom: "+(0)+"px;padding-left: "+(0)+"px;padding-right: "+(0)+"px;margin:auto;";
         this.actor.connect('button-press-event', Lang.bind(this, function() {
            this.container.add_style_pseudo_class('pressed');
         }));
      } catch(e) {
         Main.notifyError("ErrorHover:",e.message);
      }
   },

   destroy: function() {
      this.menu.destroy();
      PopupMenu.PopupSubMenuMenuItem.prototype.destroy.call(this);
      this.container.destroy();
   },

   setSpecialColor: function(specialColor) {
      if(specialColor) {
         this.container.set_style_class_name('menu-favorites-box');
         this.container.add_style_class_name('menu-hover-icon-box');
      }
      else {
         this.container.set_style_class_name('');
      }
   },

   //setActive: function(active) {
   //   this.actor.remove_style_pseudo_class('active');
   //},

   navegateHoverMenu: function(symbol, actor) {
      if((symbol == Clutter.KEY_Down)||(symbol == Clutter.KEY_Up)) {
         if(this.account.active) {
            this.fav_actor = this.notificationsSwitch.actor;
            Mainloop.idle_add(Lang.bind(this, this._putFocus));
         }
         if(this.notificationsSwitch.active) {
            this.fav_actor = this.account.actor;
            Mainloop.idle_add(Lang.bind(this, this._putFocus));
         }
      }
   },

   _onKeyPressEvent: function(actor, event) {
      let symbol = event.get_key_symbol();

      if(symbol == Clutter.KEY_Right) {
         this.toggleMenu();
         global.stage.set_key_focus(this.notificationsSwitch.actor);
         //this.menu.actor.navigate_focus(null, Gtk.DirectionType.DOWN, false);
         return true;
      } else if (symbol == Clutter.KEY_Left && this.menu.isOpen) {
         global.stage.set_key_focus(this.actor);
         this.toggleMenu();
         return true;
      }

      return PopupMenu.PopupBaseMenuItem.prototype._onKeyPressEvent.call(this, actor, event);
    },

   _putFocus: function() {
      global.stage.set_key_focus(this.fav_actor);
   },

   setIconSize: function (iconSize) {
      this.iconSize = iconSize;
      if(this._userIcon)
         this._userIcon.set_icon_size(this.iconSize);
      if(this.icon)
         this.icon.set_icon_size(this.iconSize);
      if(this.lastApp)
         this.lastApp.set_icon_size(this.iconSize);
      this.actor.set_height(this.iconSize);
   },

   _onButtonReleaseEvent: function (actor, event) {
      if(event.get_button()==1) {
         this.activate(event);
         this.toggleMenu();
         if(this.parent.controlBox) {
            this.parent.controlBox.visible = false;
            this.parent.controlBox.visible = true;
         }
      }
      this.actor.remove_style_pseudo_class('pressed');
      return true;
   },

   _subMenuOpenStateChanged: function(menu, open) {
       if(this.menu.isOpen) {
          this.parent._updateSize();
          //this.menu.actor.can_focus = false;
       }
       else {
          //global.stage.set_key_focus(this.parent.searchEntry);
          //this.menu.actor.can_focus = true;
       }
   },
    
   activate: function(event) {
      //this.parent.menu.close();
      //Main.notify("close");
      //PopupMenu.PopupBaseMenuItem.prototype.activate.call(this, event, true);
   },

   closeMenu: function() {
      this.menu.close(true);
      this.setActive(false);
      this.container.remove_style_pseudo_class('open');
   },
    
   toggleMenu: function() {
      if(this.menu.isOpen) {
         this.menu.close(true);
         this.container.remove_style_pseudo_class('open');
         this.menu.sourceActor._delegate.setActive(false);
      } else {
         this.menu.open();
         this.container.add_style_pseudo_class('open');
         this.menu.sourceActor._delegate.setActive(true);
      }
   },

   _onUserChanged: function() {
      if(this._user.is_loaded) {
         this.userLabel.set_text (this._user.get_real_name());
         if(this._userIcon) {

            let iconFileName = this._user.get_icon_file();
            let iconFile = Gio.file_new_for_path(iconFileName);
            let icon;
            if(iconFile.query_exists(null)) {
               icon = new Gio.FileIcon({file: iconFile});
            } else {
               icon = new Gio.ThemedIcon({name: 'avatar-default'});
            }
            this._userIcon.set_gicon(icon);
            this._userIcon.show(); 
 
         }
      }
   },

   refresh: function (icon) {
      if(this.actor.visible) {
         if((icon)&&(this.icon)) {
            this._removeIcon();
            this.icon.set_icon_name(icon);
            this.addActor(this.icon, 0);
         } else
            this.refreshFace();
      }
   },

   refreshApp: function (app) {
      if(this.actor.visible) {
         this._removeIcon();
         this.lastApp = app.create_icon_texture(this.iconSize);
         if(this.lastApp) {
            this.addActor(this.lastApp, 0);
         }
      }
   },

   refreshPlace: function (place) {
      if(this.actor.visible) {
         this._removeIcon();
         this.lastApp = place.iconFactory(this.iconSize);
         if(this.lastApp) {
            this.addActor(this.lastApp, 0);
         }
      }
   },

   refreshFile: function (file) {
      if(this.actor.visible) {
         this._removeIcon();
         this.lastApp = file.createIcon(this.iconSize);
         if(this.lastApp) {
            this.addActor(this.lastApp, 0);
         }
      }
   },

   refreshFace: function () {
      if(this.actor.visible) {
         this._removeIcon();
         if(this._userIcon) {
            this.addActor(this._userIcon, 0);
         }
      }
   },

   _removeIcon: function () {
      if(this.lastApp) {
         this.removeActor(this.lastApp);
         this.lastApp.destroy();
         this.lastApp = null;
      }
      if((this.icon)&&(this.icon.get_parent() == this.actor))
         this.removeActor(this.icon);
      if((this._userIcon)&&(this._userIcon.get_parent() == this.actor))
         this.removeActor(this._userIcon);
   }
};

function CategoriesApplicationsBox() {
   this._init();
}

CategoriesApplicationsBox.prototype = {
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
         this.parent.menu.setResizeArea(this.parent.deltaMinResize);
         if(this.parent.appMenu) {
            this.parent.appMenu.setResizeArea(this.parent.deltaMinResize);
         }
      }
      else {
         this.bttResize.remove_style_pseudo_class('open');
         this.bttResize.get_children()[0].set_icon_name('changes-allow');
         this.parent.menu.setResizeArea(0);
         if(this.parent.appMenu) {
            this.parent.appMenu.setResizeArea(0);
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

function PowerBox(parent, theme, iconSize, hover, selectedAppBox) {
   this._init(parent, theme, iconSize, hover, selectedAppBox);
}

PowerBox.prototype = {
   _init: function(parent, theme, iconSize, hover, selectedAppBox) {
      this.parent = parent;
      this.iconSize = iconSize;
      this.signalKeyPowerID = 0;
      this.selectedAppBox = selectedAppBox;
      this.hover = hover;
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
            this._systemButton[cSys].setActive(false);
         if(this.signalKeyPowerID > 0)
            this.actor.disconnect(this.signalKeyPowerID);
         this.powerSelected = -1;
         this.bttChanger.setActive(false);
      }));
      this.separatorPower = new SeparatorBox(false, 0);
      //Lock screen "preferences-desktop-screensaver"
      let button = new MenuItems.SystemButton(this.parent, null, "system-lock-screen", _("Lock screen"), _("Lock the screen"), this.hover, this.selectedAppBox,  this.iconSize, false);
      button.actor.connect('enter-event', Lang.bind(this, this._onEnterEvent));
      button.actor.connect('leave-event', Lang.bind(this, this._onLeaveEvent));
      button.setAction(Lang.bind(this, this._onLockScreenAction));

      this._powerButtons.push(button);
        
      //Logout button "system-log-out" "system-users" "user-info"
      button = new MenuItems.SystemButton(this.parent, null, "system-log-out", _("Logout"), _("Leave the session"), this.hover, this.selectedAppBox,  this.iconSize, false);        
      button.actor.connect('enter-event', Lang.bind(this, this._onEnterEvent));
      button.actor.connect('leave-event', Lang.bind(this, this._onLeaveEvent));
      button.setAction(Lang.bind(this, this._onLogoutAction));

      this._powerButtons.push(button);

      //Shutdown button
      button = new MenuItems.SystemButton(this.parent, null, "system-shutdown", _("Quit"), _("Shutdown the computer"), this.hover, this.selectedAppBox, this.iconSize, false);        
      button.actor.connect('enter-event', Lang.bind(this, this._onEnterEvent));
      button.actor.connect('leave-event', Lang.bind(this, this._onLeaveEvent)); 
      button.setAction(Lang.bind(this, this._onShutdownAction));

      this._powerButtons.push(button);
      this.setTheme(theme);
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
      this.separatorPower.setLineVisible(haveLine);
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
      this.bttChanger = new ButtonChangerBox(this.parent, "forward", this.iconSize, ["Show Down", "Options"], 0, Lang.bind(this, this._onPowerChange));
      this.bttChanger.setTextVisible(false);
      this.activeBar.add(this._powerButtons[2].actor, { x_fill: false, x_align: aling });
      this.activeBar.add(this.bttChanger.actor, { x_fill: true, x_align: aling });
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
        this.bttChanger.setActive(true);
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
      this.parent.applicationsScrollBox.setAutoScrolling(false);
      this.parent.categoriesScrollBox.setAutoScrolling(false);
      //this.parent.favoritesScrollBox.setAutoScrolling(false);
      this.parent.applicationsScrollBox.setAutoScrolling(this.parent.autoscroll_enabled);
      this.parent.categoriesScrollBox.setAutoScrolling(this.parent.autoscroll_enabled);
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
      if(this.activeBar)
         this.bttChanger.activateSelected("Show Down");
   },

   navegatePowerBox: function(symbol, actor) {
      if(this.activeBar) {
         if((symbol == Clutter.KEY_Up) || (symbol == Clutter.KEY_Left)) {
            if(this.powerSelected == -1) {
               this.bttChanger.setActive(false);
               this.powerSelected = 2;
               this._powerButtons[this.powerSelected].setActive(true);
            } else if(this.powerSelected == 0) {
               this._powerButtons[this.powerSelected].setActive(false);
               this.powerSelected = -1;
               this.bttChanger.setActive(true);
            } else {
               this._powerButtons[this.powerSelected].setActive(false);
               if(this._powerButtons[this.powerSelected - 1].actor.visible) {
                  this.powerSelected--;
                  this._powerButtons[this.powerSelected].setActive(true);
               } else {
                  this.powerSelected = -1;
                  this.bttChanger.setActive(true);
               }
            }
         }
         else if((symbol == Clutter.KEY_Down) || (symbol == Clutter.KEY_Right)) {
            if(this.powerSelected == -1) {
               this.bttChanger.setActive(false);
               if(this._powerButtons[0].actor.visible)
                  this.powerSelected = 0;
               else
                  this.powerSelected = 2;
               this._powerButtons[this.powerSelected].setActive(true);
            } else if(this.powerSelected == 2) {
               this._powerButtons[this.powerSelected].setActive(false);
               this.powerSelected = -1;
               this.bttChanger.setActive(true);
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
               this.bttChanger.activateNext();
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
      this.boxHeightChange = true;
      this.actor = new St.BoxLayout({ style_class: 'menu-selected-app-box', vertical: true });
      this.appTitle = new St.Label({ style_class: 'menu-selected-app-title', text: "" });
      this.appDescription = new St.Label({ style_class: 'menu-selected-app-description', text: "" });
      this.actor.add_actor(this.appTitle);
      this.actor.add_actor(this.appDescription);
     // this.setAlign(St.Align.START);
      this.setDateTimeVisible(activeDateTime);
      this.appTitle.connect('allocation_changed', Lang.bind(this, this._onAllocationChanged));
      this.appDescription.connect('allocation_changed', Lang.bind(this, this._onAllocationChanged));
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

function ButtonChangerBox(parent, icon, iconSize, labels, selected, callBackOnSelectedChange) {
   this._init(parent, icon, iconSize, labels, selected, callBackOnSelectedChange);
}

ButtonChangerBox.prototype = {
   __proto__: PopupMenu.PopupSubMenuMenuItem.prototype,

   _init: function (parent, icon, iconSize, labels, selected, callBackOnSelectedChange) {
      PopupMenu.PopupSubMenuMenuItem.prototype._init.call(this, labels[selected]);
      this.theme = "";
      this.visible = true;
      this.actor.set_style_class_name('');
      this.actor.reactive = true;
      this.box = new St.BoxLayout({ style_class: 'menu-category-button', reactive: true, track_hover: true });
      this.parent = parent;
      this.labels = labels;
      this.selected = selected;
      this.callBackOnSelectedChange = callBackOnSelectedChange;
      let parentT = this.label.get_parent();
      if(parentT == this.actor) this.removeActor(this.label);
      if(parentT != null) parentT.remove_actor(this.label);
      this.label.set_style_class_name('menu-selected-app-title');

      parentT = this._triangle.get_parent();
      if(parentT == this.actor) this.removeActor(this._triangle);
      else if(parentT != null) parentT.remove_actor(this._triangle);
      //this._triangle = new St.Label();
      this.addActor(this.box);

      this.icon = new St.Icon({ style_class: 'popup-menu-icon', icon_type: St.IconType.FULLCOLOR, icon_name: icon, icon_size: iconSize });
      this.box.add(this.label, {x_fill: false, y_fill: false, x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE });
      this.label.realize();
      if(this.icon) {
         this.box.add(this.icon, {x_fill: false, y_fill: false, x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE });
         this.icon.realize();
      } 

      this.box.connect('enter-event', Lang.bind(this, function() {
         this.setActive(true);
      }));
      this.box.connect('leave-event', Lang.bind(this, function() {
         this.setActive(false); 
      }));
   },

   setIconSize: function(iconSize) {
      if(this.icon)
         this.icon.set_icon_size(iconSize);
   },

   setTextVisible: function(visible) {
      this.label.visible = visible;
   },

   setTheme: function(theme) {
      this.theme = '-' + theme;
      this.box.set_style_class_name('menu-category-button');
      this.box.add_style_class_name('menu-swap-button-' + this.theme);
   },

   setActive: function(active) {
      if(this.active != active) {
         this.active = active;
         if(!this.parent.actorResize) {
            if(active) {
               global.set_cursor(Cinnamon.Cursor.POINTING_HAND);
               this.box.set_style_class_name('menu-category-button-selected');
               this.box.add_style_class_name('menu-swap-button' + this.theme + '-selected');
            }
            else {
               global.unset_cursor();
               this.box.set_style_class_name('menu-category-button');
               this.box.add_style_class_name('menu-swap-button' + this.theme);
            }
         }
         this.emit('active-changed', active);
      }
   },
 
   _onButtonReleaseEvent: function(actor, event) {
      if(!this.parent.pressed) {
         if(event.get_button() == 1) {
            this.setActive(false);
            this.activateNext();
            Mainloop.idle_add(Lang.bind(this, function() {
               let [mx, my] = event.get_coords();
               let [ax, ay] = actor.get_transformed_position();
               let aw = actor.get_width();
               let ah = actor.get_height();
               if((mx > ax)&&(mx < ax + aw)&&(my > ay)&&(my < ay + ah))
                  this.setActive(true);
            }));
         }
         //PopupMenu.PopupSubMenuMenuItem.prototype._onButtonReleaseEvent.call(actor, event);
      }
      this.parent._disableResize();
      return true;
   },

   activateNext: function() {
      if(this.selected >= this.labels.length - 1)
         this.selected = 0;
      else
         this.selected ++;
      this.activateIndex(this.selected);
   },

   getSelected: function() {
      return this.labels[this.selected];
   },

   activateSelected: function(selected) {
      let index = this.labels.indexOf(selected);
      if((index != -1)&&(index != this.selected)) {
         this.activateIndex(index);
      }
   },

   activateIndex: function(index) {
      this.selected = index;
      this.label.set_text(this.labels[this.selected]);
      if(this.callBackOnSelectedChange) {
         this.callBackOnSelectedChange(this.labels[this.selected]);
      }
   }
};

function GnoMenuBox(parent, hoverIcon, selectedAppBox, powerPanel, verticalPanel, iconSize, callBackFun) {
   this._init(parent, hoverIcon, selectedAppBox, powerPanel, verticalPanel, iconSize, callBackFun);
}

GnoMenuBox.prototype = {
   _init: function(parent, hoverIcon, selectedAppBox, powerPanel, verticalPanel, iconSize, callBackFun) {
      this.actor = new St.BoxLayout({ vertical: verticalPanel, reactive: true, track_hover: true });
      this.hoverBox = new St.BoxLayout({ vertical: false });
      this.powerBox = new St.BoxLayout({ vertical: verticalPanel });
      this.actor.add_actor(this.hoverBox);
      this.itemsBox = new St.BoxLayout({ vertical: verticalPanel });
      this.scrollActor = new ConfigurableScrolls.ScrollItemsBox(parent, this.itemsBox, verticalPanel, St.Align.START);
      this.separatorTop = new SeparatorBox(false, 20);
      this.actor.add_actor(this.separatorTop.actor);
      this.actor.add(this.scrollActor.actor, { x_fill: true, y_fill: true, expand: false});
      this.actor.add(this.powerBox, { x_fill: true, y_fill: true, expand: true });
      this.actor._delegate = this;
      this._gnoMenuSelected = 0;
      this.parent = parent;
      this.hover = hoverIcon;
      this.selectedAppBox = selectedAppBox;
      this.powerPanel = powerPanel;
      this.vertical = verticalPanel;
      this.iconSize = iconSize;
      this.iconsVisible = true;
      this.callBackFun = callBackFun;
      this.takePower(true);
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

   destroy: function() {
      this.separatorTop.destroy();
      for(let i = 0; i < this._actionButtons.length; i++) {
         this._actionButtons[i].destroy();
      }
      this.actor.destroy();
   },
   
   _createActionButtons: function() {
      this._actionButtons = new Array();
      let button = new MenuItems.SystemButton(this.parent, null, "emblem-favorite", _("Favorites"), _("Favorites"), this.hover, this.selectedAppBox, this.iconSize, true);
      //let button = new CategoryButtonExtended(_("Favorites"), this.iconSize, true);
      button.actor.connect('enter-event', Lang.bind(this, this._onEnterEvent));
      button.actor.connect('leave-event', Lang.bind(this, this._onLeaveEvent));
      //button.setAction(Lang.bind(this, this._changeSelectedButton));
      this.favorites = button;
      this._actionButtons.push(button);
        
      //Logout button  //preferences-other  //emblem-package
      button = new SystemButton(this.parent, null, "preferences-other", _("All Applications"), _("All Applications"), this.hover, this.selectedAppBox,  this.iconSize, true);
      button.actor.connect('enter-event', Lang.bind(this, this._onEnterEvent));
      button.actor.connect('leave-event', Lang.bind(this, this._onLeaveEvent));
      //button.setAction(Lang.bind(this, this._changeSelectedButton));
      this.appList = button;
      this._actionButtons.push(button);

      //Shutdown button
      button = new SystemButton(this.parent, null, "folder", _("Places"), _("Places"), this.hover, this.selectedAppBox,  this.iconSize, true);
      button.actor.connect('enter-event', Lang.bind(this, this._onEnterEvent));
      button.actor.connect('leave-event', Lang.bind(this, this._onLeaveEvent)); 
      //button.setAction(Lang.bind(this, this._changeSelectedButton));
      this.places = button;
      this._actionButtons.push(button);

      //Shutdown button
      button = new SystemButton(this.parent, null, "folder-recent", _("Recent Files"), _("Recent Files"), this.hover, this.selectedAppBox,  this.iconSize, false);       
      button.actor.connect('enter-event', Lang.bind(this, this._onEnterEvent));
      button.actor.connect('leave-event', Lang.bind(this, this._onLeaveEvent)); 
      //button.setAction(Lang.bind(this, this._changeSelectedButton));
      this.recents = button;
      this._actionButtons.push(button);
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
      let parent = this.hover.container.get_parent();
      if(parent) {
         parent.remove_actor(this.hover.container);
      }
      if(take) {
         this.hoverBox.add(this.hover.container, { x_fill: false, x_align: St.Align.MIDDLE, expand: true });
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
      this.separatorMiddle = new SeparatorBox(false, 20);// St.BoxLayout({ vertical: false, height: 20 });
      this.itemsBox.add_actor(this.separatorMiddle.actor);
      this.itemsBox.add_actor(this.systemName);
      this.itemsBox.add_actor(this.itemsSystem);
      this.scrollActor = new ConfigurableScrolls.ScrollItemsBox(parent, this.itemsBox, true, St.Align.START);
      this.separatorTop = new SeparatorBox(false, 20);//St.BoxLayout({ vertical: false, height: 20 });
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
      this.takePower(true);

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
      this.separatorMiddle.setLineVisible(haveLine);
      this.separatorTop.setLineVisible(haveLine);
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
      let parent = this.hover.container.get_parent();
      if(parent) {
         parent.remove_actor(this.hover.container);
      }
      if(take) {
         this.hoverBox.add(this.hover.container, { x_fill: false, x_align: St.Align.MIDDLE, expand: true });
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
      let currBookmark, item;
      for(let i = 0; i < placesList.length; i++) {
         if(placesList[i] != "") {
            currBookmark = this.getBookmarkById(listBookmarks, placesList[i]);
            item = new MenuItems.PlaceButtonAccessible(this.parent, this.scrollActor, currBookmark, placesName[placesList[i]], false,
                                                     this.iconSize, this.textButtonWidth, this.appButtonDescription);
            item.actor.connect('enter-event', Lang.bind(this, this._appEnterEvent, item));
            //item.connect('enter-event', Lang.bind(this, this._appEnterEvent, item));
            item.actor.connect('leave-event', Lang.bind(this, this._appLeaveEvent, item));
            this.itemsPlaces.add_actor(item.actor);
            //if(item.menu)
               this.itemsPlaces.add_actor(item.menu.actor);
            //else {//Remplace menu actor by a hide false actor.
            //   falseActor = new St.BoxLayout();
            //   falseActor.hide();
            //   this.itemsPlaces.add_actor(falseActor);
            //}
            this._staticButtons.push(item);
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
         let item = new MenuItems.FavoritesButton(this.parent, this.scrollActor, this.vertical, true, app, appsName[app.get_id()],
                                                4, this.iconSize, true, this.textButtonWidth, this.appButtonDescription, this._applicationsBoxWidth);
         item.actor.connect('enter-event', Lang.bind(this, this._appEnterEvent, item));
         item.actor.connect('leave-event', Lang.bind(this, this._appLeaveEvent, item));
         item.actor.set_style_class_name('menu-application-button');
         this.itemsSystem.add_actor(item.actor);
         this.itemsSystem.add_actor(item.menu.actor);
         this._staticButtons.push(item);
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
