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

const Applet = imports.ui.applet;
const Signals = imports.signals;
const Params = imports.misc.params;
const Atk = imports.gi.Atk;
const St = imports.gi.St;
const Pango = imports.gi.Pango;
const Clutter = imports.gi.Clutter;
const AccountsService = imports.gi.AccountsService;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;
const Cinnamon = imports.gi.Cinnamon;
const Gettext = imports.gettext;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Tweener = imports.ui.tweener;
const DND = imports.ui.dnd;
//const PopupMenu = imports.ui.popupMenu;
const Main = imports.ui.main;
const AppFavorites = imports.ui.appFavorites;
const FileUtils = imports.misc.fileUtils;
const Util = imports.misc.util;
const AppletPath = imports.ui.appletManager.applets['configurableMenu@lestcape'];
const ConfigurableMenus = AppletPath.configurableMenus;

//const Signals = imports.signals;
//MenuItems

const USER_DESKTOP_PATH = FileUtils.getUserDesktopDir();

function ApplicationContextMenuItem(appButton, action, label, icon, id) {
   this._init(appButton, action, label, icon, id);
}

ApplicationContextMenuItem.prototype = {
   __proto__: ConfigurableMenus.ConfigurablePopupBaseMenuItem.prototype,

   _init: function (appButton, action, label, icon, id) {
      ConfigurableMenus.ConfigurablePopupBaseMenuItem.prototype._init.call(this, {focusOnHover: false});
      this._appButton = appButton;
      this._action = action;
      if(id)
         this.id = id;
      this.container = new St.BoxLayout();
      this.label = new St.Label({ text: label });
      if(icon) {
         this.icon = icon;
         this.container.add(this.icon, { x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE, x_fill: false, y_fill: false, expand: false });
         this.label.style = "padding-left: 4px;";
      }
      this.container.add(this.label, { x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE, x_fill: false, y_fill: false, expand: false });
      this.addActor(this.container);
   },

   activate: function (event) {
      let needClose = false;
      switch (this._action) {
         case "open_with":
            this._appButton.launch(this.id);
            needClose = true;
            break;
         case "add_to_panel":
            let addedLauncher = false;
            try {//try to use jake.phy applet old way first, this will be removed(it's deprecate)
               let winListApplet = imports.ui.appletManager.applets['WindowListGroup@jake.phy@gmail.com'];
               if((winListApplet)&&(winListApplet.applet.GetAppFavorites)) {
                  winListApplet.applet.GetAppFavorites().addFavorite(this._appButton.app.get_id());
                  addLauncher = true;
               }
            } catch (e) {
               global.log(e);//could not be create an applet or acceptNewLauncher it's not include.
            }
            if(!addedLauncher) {//jake.phy applet fail to add an applet, then try to use the cinnamon old and new way.
               if(Main.AppletManager.Roles) {//try to use the cinnamon new way first
                  try {
                     if(!Main.AppletManager.get_role_provider_exists(Main.AppletManager.Roles.PANEL_LAUNCHER) &&
                        (!(imports.ui.appletManager.applets['panel-launchers@cinnamon.org']))) {
                        let new_applet_id = global.settings.get_int("next-applet-id");
                        global.settings.set_int("next-applet-id", (new_applet_id + 1));
                        let enabled_applets = global.settings.get_strv("enabled-applets");
                        enabled_applets.push("panel1:right:0:panel-launchers@cinnamon.org:" + new_applet_id);
                        global.settings.set_strv("enabled-applets", enabled_applets);
                     }
                     let launcherApplet = Main.AppletManager.get_role_provider(Main.AppletManager.Roles.PANEL_LAUNCHER);
                     if(launcherApplet)
                        launcherApplet.acceptNewLauncher(this._appButton.app.get_id());
                     addLauncher = true;
                  } catch (e) {
                     global.log(e);//could not be create an applet or acceptNewLauncher it's not include.
                  }
               }
            }
            if(!addedLauncher) {//Could be that it's the old way of Cinnamon launcher, try old way.
               let settings = new Gio.Settings({ schema: 'org.cinnamon' });
               let desktopFiles = settings.get_strv('panel-launchers');
               if(desktopFiles) {
                  desktopFiles.push(this._appButton.app.get_id());
                  settings.set_strv('panel-launchers', desktopFiles);
               }
            }
            break;
         case "add_to_desktop":
            try {
               if(this._appButton.app.isPlace) {
                  this._appButton.app.make_desktop_file();
               } else {
                  let file = Gio.file_new_for_path(this._appButton.app.get_app_info().get_filename());
                  let destFile = Gio.file_new_for_path(USER_DESKTOP_PATH+"/"+this._appButton.app.get_id());
                  file.copy(destFile, 0, null, function(){});
                  // Need to find a way to do that using the Gio library, but modifying the access::can-execute attribute on the file object seems unsupported
                  Util.spawnCommandLine("chmod +x \""+USER_DESKTOP_PATH+"/"+this._appButton.app.get_id()+"\"");
               }
            } catch(e) {
               //Main.notify("err:", e.message);
               global.log(e);
            }
            break;
         case "add_to_favorites":
            AppFavorites.getAppFavorites().addFavorite(this._appButton.app.get_id());
            this._appButton.parent._updateSize();
            break;
         case "remove_from_favorites":
            AppFavorites.getAppFavorites().removeFavorite(this._appButton.app.get_id());
            break;
         case "add_to_accessible_panel":
           try {
            if(this._appButton.app.isPlace) {
               if(!this._appButton.parent.isInPlacesList(this._appButton.place.id)) {
                  let placesList = this._appButton.parent.getPlacesList();
                  placesList.push(this._appButton.place.id);
                  this._appButton.parent.setPlacesList(placesList);
                  
               }
            } else {
               if(!this._appButton.parent.isInAppsList(this._appButton.app.get_id())) {
                let appsList = this._appButton.parent.getAppsList();
                  appsList.push(this._appButton.app.get_id());
                  this._appButton.parent.setAppsList(appsList);
               }
            }
           } catch (e) {Main.notify("access", e.message);}
            break;
         case "remove_from_accessible_panel":
            try {
            if(this._appButton.app.isPlace) {
               if(this._appButton.parent.isInPlacesList(this._appButton.app.get_id())) {
                  let parentBtt = this._appButton.parent;
                  let placesList = parentBtt.getPlacesList();
                  placesList.splice(placesList.indexOf(this._appButton.place.id), 1);
                  parentBtt.setPlacesList(placesList);
               }
            } else {
               if(this._appButton.parent.isInAppsList(this._appButton.app.get_id())) {
                  let parentBtt = this._appButton.parent;
                  let appsList = parentBtt.getAppsList();
                  appsList.splice(appsList.indexOf(this._appButton.app.get_id()), 1);
                  parentBtt.setAppsList(appsList);
               }
            }
            } catch (e) {Main.notify("access", e.message);}
            break;
         case "edit_name":
            try {
            if(this._appButton.app.isPlace) {
               if(!(this._appButton instanceof PlaceButton)&&(this._appButton instanceof PlaceButtonAccessible)&&
                  (!this._appButton.nameEntry.visible))
                  this._appButton.editText(true);
            } else {
               if((this._appButton instanceof FavoritesButton)&&
                  (this._appButton.scrollActor != this._appButton.parent.favoritesScrollBox)&&(!this._appButton.nameEntry.visible))
                  this._appButton.editText(true);
            }
            } catch (e) {Main.notify("access", e.message);}
            break;
         case "default_name":
            try {
            if(this._appButton.app.isPlace) {
               if(!(this._appButton instanceof PlaceButton)&&(this._appButton instanceof PlaceButtonAccessible)) {
                  this._appButton.setDefaultText();
               }
            } else {
               if((this._appButton instanceof FavoritesButton)&&
                  (this._appButton.scrollActor != this._appButton.parent.favoritesScrollBox)) {
                  this._appButton.setDefaultText();
                  return true;
               }
            }
            } catch (e) {Main.notify("access", e.message);}
            break;
         case "save_name":
            try {
            if(this._appButton.app.isPlace) {
               if(!(this._appButton instanceof PlaceButton)&&(this._appButton instanceof PlaceButtonAccessible)&&
                 (this._appButton.nameEntry.visible)) {
                  this._appButton.editText(false);
               }
            } else {
               if((this._appButton instanceof FavoritesButton)&&
                  (this._appButton.scrollActor != this._appButton.parent.favoritesScrollBox)&&(this._appButton.nameEntry.visible)) {
                  this._appButton.editText(false);
                  return true;
               }
            }
            } catch (e) {Main.notify("access", e.message);}
            break;
         case "uninstall_app":
            try {
               if(!this._appButton.app.isPlace) {
                  this._appButton.parent.pkg.uninstallProgram(this._appButton.app.get_id());
                  needClose = true;
               }
            } catch (e) {Main.notify("access", e.message);}
            break;

      }
      this._appButton.toggleMenu();
      if(needClose)
         this._appButton.parent.menu.close();
      return true;
   }
};

function PackageItem(parent, pkg, packageName, gIconInstaller, iconSize, textWidth, appDesc, vertical, appWidth) {
   this._init(parent, pkg, packageName, gIconInstaller, iconSize, textWidth, appDesc, vertical, appWidth);
}

PackageItem.prototype = {
   __proto__: ConfigurableMenus.ConfigurablePopupBaseMenuItem.prototype,

   _init: function(parent, pkg, packageName, gIconInstaller, iconSize, textWidth, appDesc, vertical, appWidth) {
      ConfigurableMenus.ConfigurablePopupBaseMenuItem.prototype._init.call(this);
      this.actor.set_style_class_name('menu-application-button');
      this.iconSize = iconSize;
      this.parent = parent;
      this.pkg = pkg;
      this.packageName = packageName;
      this.gIconInstaller = gIconInstaller;
      this.string = "";
      this.app = this._createAppWrapper(packageName, gIconInstaller);
      this.name = this.app.get_name();
      this.labelName = new St.Label({ text: this.name , style_class: 'menu-application-button-label' });
      this.labelDesc = new St.Label({ style_class: 'menu-application-button-label' });
      this.labelDesc.visible = false;
      this.container = new St.BoxLayout();
      this.container.set_width(appWidth);
      this.textBox = new St.BoxLayout({ vertical: true });
      this.setTextMaxWidth(textWidth);
      this.setAppDescriptionVisible(appDesc);
      this.container.set_vertical(!vertical);
      this.setVertical(vertical);

      this.icon = this.app.create_icon_texture(this.iconSize);
      if(this.icon) {
         this.container.add(this.icon, { x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE, x_fill: false, y_fill: false, expand: false });
         this.icon.realize();
      }
      this.container.add(this.textBox, { x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE, x_fill: false, y_fill: false, expand: false });
      this.addActor(this.container);

      this.labelName.realize();
      this.labelDesc.realize();
      this.isDraggableApp = false;
   },

   updateData: function(packageName, iconSize, textWidth, appDesc, vertical, appWidth) {
      this.packageName = packageName;
      this.app = this._createAppWrapper(packageName, this.gIconInstaller);
      this.name = this.app.get_name();
      this.labelName.set_text(this.name);
      this.setIconSize(iconSize);
      this.setTextMaxWidth(textWidth);
      this.setAppDescriptionVisible(appDesc);
      this.setVertical(vertical);
      this.container.set_width(appWidth);
   },

   setIconSize: function(iconSize) {
      if(this.iconSize != iconSize) {
         this.iconSize = iconSize;
         if(this.icon) {
            let visible = this.icon.visible; 
            let parentIcon = this.icon.get_parent();
            if(parentIcon)
               parentIcon.remove_actor(this.icon);
            this.icon.destroy();
            this.icon = this.app.create_icon_texture(this.iconSize);
            this.icon.visible = visible;
            this.container.insert_actor(this.icon, 0);
         }
      }
   },

   setAppDescriptionVisible: function(visible) {
      if(this.labelDesc.visible != visible) {
         this.labelDesc.visible = visible;
      }
      if(visible) {
         let desc = this.app.get_description();
         if(desc)
            this.labelDesc.set_text(desc.split("\n")[0]);
      }
   },

   setTextMaxWidth: function(maxWidth) {
      if(this.textWidth != maxWidth) {
         this.textBox.style = "max-width: "+maxWidth+"px;";
         this.textWidth = maxWidth;
      }
   },

   setVertical: function(vertical) {
      if(this.container.get_vertical() != vertical) {
         this.container.set_vertical(vertical);
         let parentL = this.labelName.get_parent();
         if(parentL) parentL.remove_actor(this.labelName);
         parentL = this.labelDesc.get_parent();
         if(parentL) parentL.remove_actor(this.labelDesc);
         this.setTextMaxWidth(this.textWidth);
         if(vertical) {
            this.textBox.add(this.labelName, { x_align: St.Align.MIDDLE, x_fill: false, y_fill: false, expand: true });
            this.textBox.add(this.labelDesc, { x_align: St.Align.MIDDLE, x_fill: false, y_fill: false, expand: true });  
         }
         else {
            this.textBox.add(this.labelName, { x_align: St.Align.START, x_fill: false, y_fill: false, expand: true });
            this.textBox.add(this.labelDesc, { x_align: St.Align.START, x_fill: false, y_fill: false, expand: true });
         }
      }
   },

   setActive: function(active){
      if(active)
         this.actor.set_style_class_name("menu-application-button-selected");
      else
         this.actor.set_style_class_name('menu-application-button');
   },

   setString: function(string) {
      this.string = string;
      let webText = _("Package %s").format(this.packageName);
      this.labelName.set_text(webText);
   },

   activate: function(event){
      while(this.string.indexOf(" ")!= -1) {
         this.string = this.string.replace(" ", "%20");
      }

      this.pkg.installPackage(this.packageName);
      this.parent.toggle();
   },

   _createAppWrapper: function(packageName, gIconInstaller) {
      // We need this fake app to help appEnterEvent/appLeaveEvent 
      // work with our search result.
      this.app = {
         get_app_info: function() {
            this.appInfo = {
               get_filename: function() {
                  return packageName;
               }
            };
            return this.appInfo;
         },
         get_id: function() {
            return packageName;
         },
         get_description: function() {
            return _("Package to install %s").format(packageName);
         },
         get_name: function() {
            return packageName;
         },
         is_window_backed: function() {
            return false;
         },
         create_icon_texture: function(appIconSize) {
            try {
              //let gicon = new Gio.FileIcon({ file: Gio.file_new_for_path(icon_path) });
              //return new St.Icon({gicon: gicon, icon_size: appIconSize, icon_type: St.IconType.FULLCOLOR});
              return new St.Icon({gicon: gIconInstaller, icon_size: appIconSize, icon_type: St.IconType.FULLCOLOR});
            } catch (e) {}
            return null;
         }
      };
      return this.app;
   }
};


function GnomeCategoryButton(parent, name, icon, symbolic, orientation, panel_height) {
   this._init(parent, name, icon, symbolic, orientation, panel_height);
}

GnomeCategoryButton.prototype = {
   _init: function(parent, name, icon, symbolic, orientation, panel_height) {
      this.parent = parent;
      this.categoryName = name;
      if(symbolic)
         this.__icon_type = St.IconType.SYMBOLIC;
      else
         this.__icon_type = St.IconType.FULLCOLOR;
      this.__icon_name = icon;
      this._panelHeight = panel_height ? panel_height : 25;
      this._scaleMode = global.settings.get_boolean('panel-scale-text-icons') && global.settings.get_boolean('panel-resizable');
      this.actor = new St.BoxLayout({ style_class: 'applet-box', reactive: true, track_hover: true });
      this.actor.add_style_class_name('menu-applet-category-box');
      this.actor.connect('enter-event', Lang.bind(this, this._changeHover, true));
      this.actor.connect('leave-event', Lang.bind(this, this._changeHover, false));
      this._applet_icon_box = new St.Bin();
      this.actor.add(this._applet_icon_box, { y_align: St.Align.MIDDLE, y_fill: false });
      this._applet_label = new St.Label({ reactive: true, track_hover: true, style_class: 'applet-label'});
      this._label_height = (this._panelHeight / Applet.DEFAULT_PANEL_HEIGHT) * Applet.PANEL_FONT_DEFAULT_HEIGHT;
      this._applet_label.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
      this.actor.add(this._applet_label, { y_align: St.Align.MIDDLE, y_fill: false });
      this.setIconSymbolic(symbolic);
      this.set_applet_label(_(name));
      this.actor._delegate = this;
   },

   destroy: function() {
      this.actor.destroy();
   },

   _changeHover: function(actor, event, hover) {
      if(hover) {
         if(this._applet_icon)
            this._applet_icon.add_style_pseudo_class('hover');
         this._applet_label.add_style_pseudo_class('hover');
      } else {
         if(this._applet_icon)
            this._applet_icon.remove_style_pseudo_class('hover');
         this._applet_label.remove_style_pseudo_class('hover');
      }
   },

   handleDragOver: function(source, actor, x, y, time) {
      if(!this.parent.menu.isOpen)
         this.parent.menu.open();
      if(this._applet_icon)
         this._applet_icon.add_style_pseudo_class('hover');
      this.parent.onCategorieGnomeChange(this.actor);
      return DND.DragMotionResult.NO_DROP;
   },

   set_applet_icon_symbolic_name: function(icon_name) {
      if(this._scaleMode) {
         let height = (this._panelHeight / DEFAULT_PANEL_HEIGHT) * Applet.PANEL_SYMBOLIC_ICON_DEFAULT_HEIGHT;
         this._applet_icon = new St.Icon({icon_name: icon_name, icon_size: height, icon_type: St.IconType.SYMBOLIC,
                                          reactive: true, track_hover: true, style_class: 'system-status-icon' });
      } else {
         this._applet_icon = new St.Icon({icon_name: icon_name, icon_type: St.IconType.SYMBOLIC, reactive: true,
                                          track_hover: true, style_class: 'system-status-icon' });
      }
      this._applet_icon_box.child = this._applet_icon;
      this.__icon_type = St.IconType.SYMBOLIC;
      this.__icon_name = icon_name;
   },

   set_applet_icon_name: function(icon_name) {
      if(this._scaleMode) {
         this._applet_icon = new St.Icon({icon_name: icon_name, icon_size: this._panelHeight * Applet.COLOR_ICON_HEIGHT_FACTOR,
                                          icon_type: St.IconType.FULLCOLOR, reactive: true, track_hover: true, style_class: 'applet-icon' });
      } else {
         this._applet_icon = new St.Icon({icon_name: icon_name, icon_size: 22, icon_type: St.IconType.FULLCOLOR,
                                          reactive: true, track_hover: true, style_class: 'applet-icon' });
      }
      this._applet_icon_box.child = this._applet_icon;
      this.__icon_type = St.IconType.FULLCOLOR;
      this.__icon_name = icon_name;
   },

   set_applet_label: function(text) {
      this._applet_label.set_text(text);
      if(text && text != "")
         this._applet_label.set_margin_left(6.0);
      else
         this._applet_label.set_margin_left(0);
   },

   on_panel_height_changed: function(panel_height) {
      this._panelHeight = panel_height;
      this._scaleMode = global.settings.get_boolean('panel-scale-text-icons') && global.settings.get_boolean('panel-resizable');
      if(this._applet_icon_box.child) {
         this._applet_icon_box.child.destroy();
      }
      switch(this.__icon_type) {
         case St.IconType.FULLCOLOR:
            this.set_applet_icon_name(this.__icon_name);
            break;
         case St.IconType.SYMBOLIC:
            this.set_applet_icon_symbolic_name(this.__icon_name);
            break;
         case -1:
            this.set_applet_icon_path(this.__icon_name);
            break;
         default:
            break;
      }
   },

   setIconSymbolic: function(symbolic) {
      if((this.__icon_name)&&(this.__icon_name != "")) {
         if(this._applet_icon)
            this._applet_icon.destroy();
         if(symbolic)
            this.set_applet_icon_symbolic_name(this.__icon_name);
         else
            this.set_applet_icon_name(this.__icon_name);
      }
   }
};

function CategoryButton(app, iconSize, iconVisible) {
   this._init(app, iconSize, iconVisible);
}

CategoryButton.prototype = {
   __proto__: ConfigurableMenus.ConfigurablePopupBaseMenuItem.prototype,

   _init: function(category, iconSize, iconVisible) {
      ConfigurableMenus.ConfigurablePopupBaseMenuItem.prototype._init.call(this, {hover: false});
      this.category = category;
      this.iconSize = iconSize;
      this.arrowIcon = new St.Icon({icon_name: '', icon_type: St.IconType.SYMBOLIC,
                                    reactive: true, track_hover: true, style_class: 'popup-menu-icon' });
      this.arrowOrientation = St.Side.RIGHT;
      this.haveArrow = false;
      this.label = new St.Label({ style_class: 'menu-category-button-label' });
      this.label.clutter_text.line_wrap_mode = Pango.WrapMode.CHAR;//WORD_CHAR;
      this.label.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;//END;
      this.label.clutter_text.set_line_alignment(Pango.Alignment.CENTER);
      this.container = new St.BoxLayout();
      this.textBox = new St.BoxLayout({ vertical: false });
      this.setVertical(false);
      this.textBox.add(this.label, { x_align: St.Align.MIDDLE, x_fill: false, y_fill: false, expand: true });

      this._setCategoryProperties(category);
      if(this.icon) {
         this.container.add(this.icon, { x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE, x_fill: false, y_fill: false, expand: false });
         this.icon.realize();
      }
      this.container.add(this.textBox, { x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE, x_fill: true, y_fill: false, expand: true });
      //this.addActor(this.container, { expand: true, align: St.Align.END});
      
      this.label.realize();
      this.setIconVisible(iconVisible);
      this.actor.destroy();
      this.actor = new St.BoxLayout({ vertical: false, reactive: true, track_hover: true });
      //this.actor.add(this.internalActor, { x_fill: false, y_fill: true, x_align: St.Align.START, y_align: St.Align.MIDDLE, expand: true });
      this.actor.add(this.container, { x_fill: false, y_fill: false, x_align: St.Align.START, y_align: St.Align.MIDDLE, expand: true });

      this.actor.set_style_class_name('menu-category-button');
      this.actor.add_style_class_name('menu-category-button-' + this.theme);
      this.actor._delegate = this;
   },

   setActive: function (active) {
   },

   _setCategoryProperties: function(category) {
      let labelName;
      let icon = null;
      if(category) {
         icon = category.get_icon();
         if(icon && icon.get_names)
            this.icon_name = icon.get_names().toString();
         else
            this.icon_name = "";
         labelName = category.get_name();
      } else
         labelName = _("All Applications");
      this.label.set_text(labelName);
      if(category && this.icon_name) {
         this.icon = St.TextureCache.get_default().load_gicon(null, icon, this.iconSize);
      }
   },

   getCategoryID: function() {
      if(this.category)
         return this.category.get_menu_id();
      return "All";
   },

   setArrow: function(haveArrow, always, orientation) {
   /*   this.haveArrow = haveArrow;
      this.haveArrowalways = always;
     // Main.notify("haveArrow:" + haveArrow);
      this.actor.remove_actor(this.container);
      let parentArrow = this.arrowIcon.get_parent();
      if(parentArrow)
         parentArrow.remove_actor(this.arrowIcon);

      if(haveArrow) {
         this.arrowOrientation = orientation;
         if(orientation == St.Side.RIGHT) {
            this.arrowIcon.set_icon_name('media-playback-start');
            this.actor.add(this.container, { x_fill: false, y_fill: false, x_align: St.Align.START, y_align: St.Align.MIDDLE, expand: true });
            this.actor.add(this.arrowIcon, { x_fill: false, expand: false, x_align: St.Align.END });
         } else if(orientation == St.Side.LEFT) {
            this.arrowIcon.set_icon_name('media-playback-start-rtl');
            this.actor.add(this.arrowIcon, { x_fill: false, expand: false, x_align: St.Align.END });
            this.actor.add(this.container, { x_fill: false, y_fill: false, x_align: St.Align.START, y_align: St.Align.MIDDLE, expand: true });
         }
      } else {
         this.actor.add(this.container, { x_fill: false, y_fill: false, x_align: St.Align.START, y_align: St.Align.MIDDLE, expand: true });
      }*/
   },

   setArrowVisible: function(visible) {
      //if(this.haveArrow) {
      //   if(visible) {
      //      if(this.arrowOrientation == St.Side.RIGHT)
      //         this.arrowIcon.set_icon_name('media-playback-start');
      //      else if(this.arrowOrientation == St.Side.LEFT)
      //         this.arrowIcon.set_icon_name('media-playback-start-rtl');
      //   } else {
      //      this.arrowIcon.set_icon_name('');
      //   }
      //} else {
      //   this.arrowIcon.set_icon_name('');
      //}
      this.arrowIcon.visible = (visible||this.haveArrowalways);
   },

   setIconVisible: function(visible) {
      if(this.icon)
         this.icon.visible = visible;
   },

   setIconSize: function (iconSize) {
      this.iconSize = iconSize;
      if(this.icon)
         this.icon.set_icon_size(this.iconSize);
   },

   setVertical: function(vertical) {
      this.container.set_vertical(vertical);
   }
};

function PlaceCategoryButton(app, iconSize, iconVisible) {
    this._init(app, iconSize, iconVisible);
}

PlaceCategoryButton.prototype = {
   __proto__: CategoryButton.prototype,

   _init: function(category, iconSize, iconVisible) {
      CategoryButton.prototype._init.call(this, category, iconSize, iconVisible);
      this.actor._delegate = this;
   },

   _setCategoryProperties: function(category) {
      this.label.set_text(_("Places"));
      this.icon = new St.Icon({icon_name: "folder", icon_size: this.iconSize, icon_type: St.IconType.FULLCOLOR});
   },

   getCategoryID: function() {
      return "Places";
   }
};

function RecentCategoryButton(app, iconSize, iconVisible) {
   this._init(app, iconSize, iconVisible);
}

RecentCategoryButton.prototype = {
   __proto__: CategoryButton.prototype,

   _init: function(category, iconSize, iconVisible) {
      CategoryButton.prototype._init.call(this, category, iconSize, iconVisible);
      this.actor._delegate = this;
   },

   _setCategoryProperties: function(category) {
      this.label.set_text(_("Recent Files"));
      this.icon = new St.Icon({icon_name: "folder-recent", icon_size: this.iconSize, icon_type: St.IconType.FULLCOLOR});
   },

   getCategoryID: function() {
      return "Recently";
   }
};


function GenericApplicationButton(parent, parentScroll, app, withMenu, searchTexts) {
   this._init(parent, parentScroll, app, withMenu, searchTexts);
}

GenericApplicationButton.prototype = {
   __proto__: ConfigurableMenus.ConfigurablePopupSubMenuMenuItem.prototype,

   _init: function(parent, parentScroll, app, withMenu, searchTexts) {
      ConfigurableMenus.ConfigurablePopupBaseMenuItem.prototype._init.call(this, { hover: false });
      this.app = app;
      this.parent = parent;
      this.parentScroll = parentScroll;
      this.withMenu = withMenu;
      if((app)&&(searchTexts == null))
         searchTexts = [app.get_name(), app.get_description(), app.get_id()];
      if(this.withMenu) {
         this.menu = new ConfigurableMenus.ConfigurableMenu(this, 0.0, St.Side.LEFT, false);
         this.menu.actor.set_style_class_name('menu-context-menu');
         this.menu.connect('open-state-changed', Lang.bind(this, this._subMenuOpenStateChanged));
      }
      if(searchTexts) {
         this.searchTexts = new Array();
         for(let i=0; i<searchTexts.length; i++) {
            let s = searchTexts[i];
            if(s && typeof(s) == 'string')
               this.searchTexts.push(s.toLowerCase());
         }
      }
      this.searchScore = 0;
      this.actor._delegate = this;
   },

   search: function(pattern) {
      if(this.searchTexts) {
         this.searchScore = 0;
         // in theory this allows for better sorting
         let addScore = Math.pow(10, this.searchTexts.length);
         for(let i=0; i < this.searchTexts.length; i++) {
            let pos = this.searchTexts[i].indexOf(pattern);
            if(pos != -1) {
               this.searchScore += addScore;
               // extra score for beginning
               if(pos == 0)
                  this.searchScore += addScore/2;
            }
            addScore /= 10;
         }
      }
      return this.searchScore;
   },

   destroy: function() {
      //ConfigurableMenus.ConfigurablePopupSubMenuMenuItem.prototype.destroy.call(this);
      if(this.menu)
         this.menu.destroy();
      ConfigurableMenus.ConfigurablePopupBaseMenuItem.prototype.destroy.call(this);
   },

   highlight: function() {
      this.actor.add_style_pseudo_class('highlighted');
   },

   unhighlight: function() {
      var app_key = this.app.get_id();
      if (app_key == null) {
          app_key = this.app.get_name() + ":" + this.app.get_description();
      }
      this.parent._knownApps.push(app_key);
      this.actor.remove_style_pseudo_class('highlighted');
   },

   _onButtonReleaseEvent: function (actor, event) {
      if(!this.parent.pressed) {
         if(event.get_button()==1) {
            this.activate(event);
         }
         if(event.get_button()==3) {
            if(this.withMenu) {
               if(!this.menu.isOpen) {
                  this.parent.closeApplicationsContextMenus(true);
                  let box = this.actor.get_parent();
                  if((this.parent.appMenu)&&(this.parent.applicationsBox == box.get_parent().get_parent())) {
                     let boxH = box.get_height();
                     let monitor = Main.layoutManager.findMonitorForActor(box);
                     if(boxH > monitor.height - 100)
                        boxH = monitor.height - 100;
                     box.set_height(boxH);
                     this.toggleMenu();
                     this.widthC = null;
                     this.menu.actor.set_width(-1);
                     if(this.parent.appMenu) {
                        this.actor.get_parent().set_height(-1);
                     }
                     this.parent._updateSubMenuSize();
                  } else {
                     this.widthC = this.parent.menu.requestedWidth;
                     this.toggleMenu();
                     let [minWidth, natWidth] = this.menu.actor.get_preferred_width(-1);
                     this.menu.actor.set_width(natWidth);
                     this.parent.menu.setSize(this.parent.menu.requestedWidth, this.parent.menu.requestedHeight);
                     //this.parent._updateSize();
                  }
                  this.parent._previousContextMenuOpen = this;
               } else {
                  this.closeMenu();
               }
            }
         }
      }
      //this.parent._disableResize();
      return true;
   },
    
   activate: function(event) {
      this.unhighlight(); 
      this.app.open_new_window(-1);
      try {
         if(!this.app.isPlace) {
         let val = this.parent.appsUsage[this.app.get_id()];
         if(!val) val = 0;
         this.parent.appsUsage[this.app.get_id()] = val + 1;
         this.parent.setAppsUsage(this.parent.appsUsage);
         }
      } catch(e) {
         Main.notify(e.message);
      }
      this.parent.menu.close();
   },
    
   closeMenu: function() {
      if(this.withMenu) {
         this.menu.close();
         this.menu.actor.set_width(-1);
         if(this.widthC) {
            this.parent.menu.setSize(this.widthC, this.parent.menu.requestedHeight);
            this.widthC = null;
         }
      }
   },
    
   toggleMenu: function() {
      if(!this.withMenu) return;
      if(!this.menu.isOpen) {
         let children = this.menu.box.get_children();
         for(let i in children) {
            this.menu.box.remove_actor(children[i]);
         }
         let menuItem;
         if(!this.app.isPlace) {
            menuItem = new ApplicationContextMenuItem(this, "add_to_panel", _("Add to panel"));
            this.menu.addMenuItem(menuItem);
            if(USER_DESKTOP_PATH) {
               menuItem = new ApplicationContextMenuItem(this, "add_to_desktop", _("Add to desktop"));
               this.menu.addMenuItem(menuItem);
            }
            if(AppFavorites.getAppFavorites().isFavorite(this.app.get_id())) {
               menuItem = new ApplicationContextMenuItem(this, "remove_from_favorites", _("Remove from favorites"));
               this.menu.addMenuItem(menuItem);
            } else {
               menuItem = new ApplicationContextMenuItem(this, "add_to_favorites", _("Add to favorites"));
               this.menu.addMenuItem(menuItem);
            }
            if(this.parent.accessibleBox) {
               if(this.parent.isInAppsList(this.app.get_id())) {
                  menuItem = new ApplicationContextMenuItem(this, "remove_from_accessible_panel", _("Remove from accessible panel"));
                  this.menu.addMenuItem(menuItem);
               } else {
                  menuItem = new ApplicationContextMenuItem(this, "add_to_accessible_panel", _("Add to accessible panel"));
                  this.menu.addMenuItem(menuItem);
               }
            }
            if((this.parent.enableInstaller)||(this.parent.pkg.canCinnamonUninstallApps())) {
               menuItem = new ApplicationContextMenuItem(this, "uninstall_app", _("Uninstall"));
               this.menu.addMenuItem(menuItem);
            }
            if((this instanceof FavoritesButton)&&(this.parentScroll != this.parent.favoritesScrollBox)) {
               if(this.nameEntry && this.nameEntry.visible) {
                  menuItem = new ApplicationContextMenuItem(this, "save_name", _("Save name"));
                  this.menu.addMenuItem(menuItem);
               } else {
                  menuItem = new ApplicationContextMenuItem(this, "edit_name", _("Edit name"));
                  this.menu.addMenuItem(menuItem);
               }
               if((this.alterName)&&(this.alterName != "")) {
                  menuItem = new ApplicationContextMenuItem(this, "default_name", _("Default name"));
                  this.menu.addMenuItem(menuItem);
               }
            }
         } else {
            if(USER_DESKTOP_PATH) {
               menuItem = new ApplicationContextMenuItem(this, "add_to_desktop", _("Add to desktop"));
               this.menu.addMenuItem(menuItem);
            }
            if(this.parent.isInPlacesList(this.app.get_id())) {
               menuItem = new ApplicationContextMenuItem(this, "remove_from_accessible_panel", _("Remove from accessible panel"));
               this.menu.addMenuItem(menuItem);
            } else {
               menuItem = new ApplicationContextMenuItem(this, "add_to_accessible_panel", _("Add to accessible panel"));
               this.menu.addMenuItem(menuItem);
            }
            if(!(this instanceof PlaceButton)&&(this instanceof PlaceButtonAccessible)) {
               if(this.nameEntry.visible) {
                  menuItem = new ApplicationContextMenuItem(this, "save_name", _("Save name"));
                  this.menu.addMenuItem(menuItem);
               } else {
                  menuItem = new ApplicationContextMenuItem(this, "edit_name", _("Edit name"));
                  this.menu.addMenuItem(menuItem);
               }
               if((this.alterName)&&(this.alterName != "")) {
                  menuItem = new ApplicationContextMenuItem(this, "default_name", _("Default name"));
                  this.menu.addMenuItem(menuItem);
               }
            }
         }
      }
      this.menu.toggle();
   },
    
   _subMenuOpenStateChanged: function() {
      if(this.menu.isOpen) {
         this.parentScroll.scrollToActor(this.menu.actor);
      }
   },

   _onKeyPressEvent: function(actor, event) {
      let symbol = event.get_key_symbol();

      //if(symbol == Clutter.KEY_space) {
      //   if((this.withMenu) && (!this.menu.isOpen)) {
      //      this.parent.closeApplicationsContextMenus(true);
      //   }
      //   this.toggleMenu();
      //   return true;
      //}
      return ConfigurableMenus.ConfigurablePopupBaseMenuItem.prototype._onKeyPressEvent.call(this, actor, event);
   }
};

function ApplicationButton(parent, parentScroll, app, vertical, iconSize, iconSizeDrag, appWidth, appDesc) {
   this._init(parent, parentScroll, app, vertical, iconSize, iconSizeDrag, appWidth, appDesc);
}

ApplicationButton.prototype = {
   __proto__: GenericApplicationButton.prototype,
    
   _init: function(parent, parentScroll, app, vertical, iconSize, iconSizeDrag, appWidth, appDesc) {
      GenericApplicationButton.prototype._init.call(this, parent, parentScroll, app, true);

      this.iconSize = iconSize;
      this.iconSizeDrag = iconSizeDrag;
      this.category = new Array();
      this.actor.set_style_class_name('menu-application-button');
      this.icon = this.app.create_icon_texture(this.iconSize);
      this.name = this.app.get_name();
      this.labelName = new St.Label({ text: this.name , style_class: 'menu-application-button-label' });
      this.labelDesc = new St.Label({ style_class: 'menu-application-button-label' });
      this.labelDesc.visible = false;
      this.container = new St.BoxLayout();
      this.textBox = new St.BoxLayout({ vertical: true });
      this.setTextMaxWidth(appWidth);
      this.setAppDescriptionVisible(appDesc);
      this.setVertical(vertical);
      if(this.icon) {
         this.container.add(this.icon, { x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE, x_fill: false, y_fill: false, expand: false });
         this.icon.realize();
      }
      this.container.add(this.textBox, { x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE, x_fill: false, y_fill: false, expand: false });
      this.addActor(this.container);

      this.labelName.realize();
      this.labelDesc.realize();

      this._draggable = DND.makeDraggable(this.actor);
      this._draggable.connect('drag-end', Lang.bind(this, this._onDragEnd));
      this.isDraggableApp = true;
      this.actor._delegate = this;
   },

   _onDragEnd: function() {
      let [x, y, mask] = global.get_pointer();
      let reactiveActor = global.stage.get_actor_at_pos(Clutter.PickMode.REACTIVE, x, y);
      let allActor = global.stage.get_actor_at_pos(Clutter.PickMode.ALL, x, y);
      let typeName = "" + allActor;
      if((reactiveActor instanceof Clutter.Stage)&&(typeName.indexOf("MetaWindowGroup") != -1)) {
         try {
            let file = Gio.file_new_for_path(this.app.get_app_info().get_filename());
            let destFile = Gio.file_new_for_path(USER_DESKTOP_PATH+"/"+this.app.get_id());
            file.copy(destFile, 0, null, function(){});
            // Need to find a way to do that using the Gio library, but modifying the access::can-execute attribute on the file object seems unsupported
            Util.spawnCommandLine("chmod +x \""+USER_DESKTOP_PATH+"/"+this.app.get_id()+"\"");
            this.parent._refreshFavs();
            this.parent._onChangeAccessible();
            return true;
         } catch(e) {
            //Main.notify("err:", e.message);
            global.log(e);
         }
      }
      this.parent._refreshFavs();
      this.parent._onChangeAccessible();
      return false;
   },

   setAppDescriptionVisible: function(visible) {
      this.labelDesc.visible = visible;
      if(this.app.get_description())
         this.labelDesc.set_text(this.app.get_description().split("\n")[0]);
   },

   setTextMaxWidth: function(maxWidth) {
      //this.textBox.set_width(maxWidth);
      this.textBox.style = "max-width: "+maxWidth+"px;";
      this.textWidth = maxWidth;
   },

   setIconSize: function (iconSize) {
      this.iconSize = iconSize;
      if(this.icon) {
         let visible = this.icon.visible; 
         let parentIcon = this.icon.get_parent();
         if(parentIcon)
            parentIcon.remove_actor(this.icon);
         this.icon.destroy();
         this.icon = this.app.create_icon_texture(this.iconSize);
         this.icon.visible = visible;
         this.container.insert_actor(this.icon, 0);
      }
   }, 
 
   setVertical: function(vertical) {
      this.container.set_vertical(vertical);
      let parentL = this.labelName.get_parent();
      if(parentL) parentL.remove_actor(this.labelName);
      parentL = this.labelDesc.get_parent();
      if(parentL) parentL.remove_actor(this.labelDesc);
      this.setTextMaxWidth(this.textWidth);
      if(vertical) {
         this.textBox.add(this.labelName, { x_align: St.Align.MIDDLE, x_fill: false, y_fill: false, expand: true });
         this.textBox.add(this.labelDesc, { x_align: St.Align.MIDDLE, x_fill: false, y_fill: false, expand: true });  
      }
      else {
         this.textBox.add(this.labelName, { x_align: St.Align.START, x_fill: false, y_fill: false, expand: true });
         this.textBox.add(this.labelDesc, { x_align: St.Align.START, x_fill: false, y_fill: false, expand: true });
      }
   },
 
   get_app_id: function() {
      return this.app.get_id();
   },
    
   getDragActor: function() {
      //let favorites = AppFavorites.getAppFavorites().getFavorites();
      //let nbFavorites = favorites.length;
      //let monitorHeight = Main.layoutManager.primaryMonitor.height;
      //let real_size = (0.7*monitorHeight) / nbFavorites;
      //let icon_size = 0.6*real_size;
      //if(icon_size > this.iconSizeDrag) icon_size = this.iconSizeDrag;
      let icon_size = this.iconSize;
      if(this.iconSizeDrag < this.iconSize)
         icon_size = this.iconSizeDrag;
      return this.app.create_icon_texture(icon_size);
    },

    // Returns the original actor that should align with the actor
    // we show as the item is being dragged.
    getDragActorSource: function() {
       return this.actor;
    }
};

function PlaceButtonAccessible(parent, parentScroll, place, alterName, vertical, iconSize, appWidth, appDesc) {
   this._init(parent, parentScroll, place, alterName, vertical, iconSize, appWidth, appDesc);
}

PlaceButtonAccessible.prototype = {
   __proto__: GenericApplicationButton.prototype,

   _init: function(parent, parentScroll, place, alterName, vertical, iconSize, appWidth, appDesc) {
      GenericApplicationButton.prototype._init.call(this, parent, parentScroll, this._createAppWrapper(place, alterName),
                                                           (parent._listDevices().indexOf(place) == -1));
      this.iconSize = iconSize;
      this.parent = parent;
      this.place = place;
      this.alterName = alterName;

      this.actor.set_style_class_name('menu-application-button');
      this.nameEntry = new St.Entry({ name: 'menu-name-entry', hint_text: _("Type the new name..."), track_hover: true, can_focus: true });
      if((this.alterName)&&(this.alterName != ""))
         this.labelName = new St.Label({ text: this.alterName, style_class: 'menu-application-button-label' });
      else
         this.labelName = new St.Label({ text: this.place.name, style_class: 'menu-application-button-label' });
      this.labelDesc = new St.Label({ style_class: 'menu-application-button-label' });
      this.nameEntry.visible = false;
      this.labelDesc.visible = false;
      this.container = new St.BoxLayout();
      this.textBox = new St.BoxLayout({ vertical: true });
      this.setTextMaxWidth(appWidth);
      this.setAppDescriptionVisible(appDesc);
      this.setVertical(vertical);

      this.icon = this.place.iconFactory(this.iconSize);
      if(!this.icon)
         this.icon = new St.Icon({icon_name: "folder", icon_size: this.iconSize, icon_type: St.IconType.FULLCOLOR});
      if(this.icon) {
         this.container.add(this.icon, { x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE, x_fill: false, y_fill: false, expand: false });
         this.icon.realize();
      }
      this.container.add(this.textBox, { x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE, x_fill: false, y_fill: false, expand: false });
      this.addActor(this.container);

      this.labelName.realize();
      this.labelDesc.realize();

      this._draggable = DND.makeDraggable(this.actor);
      this._draggable.connect('drag-end', Lang.bind(this, this._onDragEnd));
      this.isDraggableApp = true;
   },

   _onButtonReleaseEvent: function (actor, event) {
      if(!this.parent.pressed) {
         if(event.get_button()==1) {
            this.activate(event);
         }
         if(event.get_button()==3) {
            if((this.withMenu) && (!this.menu.isOpen)) {
               this.parent.closeApplicationsContextMenus(true);
               this.parent._previousContextMenuOpen = this;
            } else {
               this.editText(false);
            }
            this.toggleMenu();
         }
      }
      //this.parent._disableResize();
      return true;
   },

   editText: function(edit) {
      if((edit)&&(!this.nameEntry.visible)) {
         this.nameEntry.set_text(this.labelName.get_text());
         this.nameEntry.visible = true;
         global.stage.set_key_focus(this.nameEntry);
         this.labelName.visible = false;
         this.labelDesc.visible = false;
      }
      else {
         if(this.nameEntry.get_text() != "") {
            global.stage.set_key_focus(this.parent.searchEntry);
            this.labelName.set_text(this.nameEntry.get_text());
            this.alterName = this.nameEntry.get_text();
            this.nameEntry.set_text("");
            this.parent.changePlaceName(this.place.id, this.alterName);
         } else
            global.stage.set_key_focus(this.actor);

         this.labelName.visible = true;
         this.labelDesc.visible = this.haveDesc;
         this.nameEntry.visible = false;
      }
   },

   setDefaultText: function() {
      global.stage.set_key_focus(this.parent.searchEntry);
      this.labelName.set_text(this.place.name);
      this.alterName = "";
      this.nameEntry.set_text("");
      this.parent.changePlaceName(this.place.id, this.alterName);
      this.labelName.visible = true;
      this.labelDesc.visible = this.haveDesc;
      this.nameEntry.visible = false;
   },

   setIconVisible: function(visible) {
      if(this.icon)
         this.icon.visible = visible;
   },

   setIconSize: function(iconSize) {
      this.iconSize = iconSize;
      if(this.icon) {
         let visible = this.icon.visible;
         let parentIcon = this.icon.get_parent();
         if(parentIcon)
            parentIcon.remove_actor(this.icon);
         this.icon.destroy();
         this.icon = this.place.iconFactory(this.iconSize);
         if(!this.icon)
            this.icon = new St.Icon({icon_name: "folder", icon_size: this.iconSize, icon_type: St.IconType.FULLCOLOR});
         if(this.icon)
            this.container.insert_actor(this.icon, 0);
         this.icon.visible = visible;
      }
   },

   setAppDescriptionVisible: function(visible) {
      this.haveDesc = visible;
      this.labelDesc.visible = visible;
      if(this.app.get_description())
         this.labelDesc.set_text(this.app.get_description());
   },

   setTextMaxWidth: function(maxWidth) {
      //this.textBox.set_width(maxWidth);
      this.textBox.style = "max-width: "+maxWidth+"px;";
      this.textWidth = maxWidth;
   },

   setVertical: function(vertical) {
      this.container.set_vertical(vertical);
      let parentL = this.labelName.get_parent();
      if(parentL) parentL.remove_actor(this.labelName);
      parentL = this.labelDesc.get_parent();
      if(parentL) parentL.remove_actor(this.labelDesc);
      parentL = this.nameEntry.get_parent();
      if(parentL) parentL.remove_actor(this.nameEntry);
      this.setTextMaxWidth(this.textWidth);
      if(vertical) {
         this.textBox.add(this.labelName, { x_align: St.Align.MIDDLE, x_fill: false, y_fill: false, expand: true });
         this.textBox.add(this.labelDesc, { x_align: St.Align.MIDDLE, x_fill: false, y_fill: false, expand: true });
         this.textBox.add(this.nameEntry, { x_align: St.Align.MIDDLE, x_fill: false, y_fill: false, expand: true });     
      }
      else {
         this.textBox.add(this.labelName, { x_align: St.Align.START, x_fill: false, y_fill: false, expand: true });
         this.textBox.add(this.labelDesc, { x_align: St.Align.START, x_fill: false, y_fill: false, expand: true });
         this.textBox.add(this.nameEntry, { x_align: St.Align.START, x_fill: false, y_fill: false, expand: true });
      }
   },

   _onDragEnd: function() {
      let [x, y, mask] = global.get_pointer();
      let reactiveActor = global.stage.get_actor_at_pos(Clutter.PickMode.REACTIVE, x, y);
      let allActor = global.stage.get_actor_at_pos(Clutter.PickMode.ALL, x, y);
      let typeName = "" + allActor;
      if((reactiveActor instanceof Clutter.Stage)&&(typeName.indexOf("MetaWindowGroup") != -1)) {
         try {
            if(this.app.isPlace) {
               this.app.make_desktop_file();
            } else {
               let file = Gio.file_new_for_path(this.app.get_app_info().get_filename());
               let destFile = Gio.file_new_for_path(USER_DESKTOP_PATH+"/"+this.app.get_id());
               file.copy(destFile, 0, null, function(){});
               // Need to find a way to do that using the Gio library, but modifying the access::can-execute attribute on the file object seems unsupported
               Util.spawnCommandLine("chmod +x \""+USER_DESKTOP_PATH+"/"+this.app.get_id()+"\"");
            }
            this.parent._refreshFavs();
            this.parent._onChangeAccessible();
            return true;
         } catch(e) {
            //Main.notify("err:", e.message);
            global.log(e);
         }
      }
      this.parent._refreshFavs();
      this.parent._onChangeAccessible();
      return false;
   },

   _createAppWrapper: function(place, alterName) {
      // We need this fake app to help standar works.
      this.app = {
         isPlace: {
         },
         get_app_info: function() {
            this.appInfo = {
               get_filename: function() {
                  try {
                     if(place.id.indexOf("bookmark:") == -1)
                        return decodeURIComponent(place.id.slice(13));
                     return decodeURIComponent(place.id.slice(16));
                  } catch(e) {
                     Main.notify("Error on decode, the encode of the text are unsupported", e.message);
                  }
                  if(place.id.indexOf("bookmark:") == -1)
                     return place.id.slice(13);
                  return place.id.slice(16);
               }
            };
            return this.appInfo;
         },
         open_new_window: function(open) {
            place.launch();
         },
         is_window_backed: function() {
            return false;
         },
         get_id: function() {
            return place.id;
         },
         get_description: function() {
            try {
               if(place.id.indexOf("bookmark:") == -1)
                  return decodeURIComponent(place.id.slice(13));
               return decodeURIComponent(place.id.slice(16));
            } catch(e) {
               Main.notify("Error on decode, the encode of the text are unsupported", e.message);
            }
            if(place.id.indexOf("bookmark:") == -1)
               return place.id.slice(13);
            return place.id.slice(16);
         },
         get_name: function() {
            if((alterName)&&(alterName != ""))
               return alterName;
            return place.name;
         },
         create_icon_texture: function(appIconSize) {
            return place.iconFactory(appIconSize);
         },
         get_icon_name: function() {
            try {
               let icon = place.iconFactory(20);
               if(icon) {
                  let icon_name = icon.get_icon_name();
                  icon.destroy();
                  return icon.get_icon_name();
               }
               return place.get_icon_name();
            } catch(e) {};
            try {
               let path = this.get_description(); //try to find the correct Image for a special folder.
               if(path == GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DOCUMENTS))
                  return "folder-documents";
               if(path == GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_PICTURES))
                  return "folder-pictures";
               if(path == GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_MUSIC))
                  return "folder-music";
               if(path == GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_VIDEOS))
                  return "folder-video";
               if(path == GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DOWNLOAD))
                  return "folder-download";
               if(path == GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_TEMPLATES))
                  return "folder-templates";
               if(path == GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_PUBLIC_SHARE))
                  return "folder-publicshare";
            } catch(e) {};  
            return "folder";
         },
         make_desktop_file: function() {
            let name = this.get_name();
            let path = this.get_app_info().get_filename();
            let raw_file = "[Desktop Entry]\n" + "Name=" + name + "\n" + "Comment=" + path + "\n" +
                           "Exec=xdg-open \"" + path + "\"\n" + "Icon=" + this.get_icon_name() +
                           "\n" + "Terminal=false\n" + "StartupNotify=true\n" + "Type=Application\n" +
                           "Actions=Window;\n" + "NoDisplay=true";
            let desktopFile = Gio.File.new_for_path(USER_DESKTOP_PATH+"/"+name+".desktop");
            let rawDesktop = desktopFile.replace(null, false, Gio.FileCreateFlags.NONE, null);
            let out_file = Gio.BufferedOutputStream.new_sized (rawDesktop, 4096);
            Cinnamon.write_string_to_stream(out_file, raw_file);
            out_file.close(null);
            Util.spawnCommandLine("chmod +x \""+USER_DESKTOP_PATH+"/"+name+".desktop\"");
         }
      };
      return this.app;
   }
};

function PlaceButton(parent, parentScroll, place, vertical, iconSize, appWidth, appDesc) {
   this._init(parent, parentScroll, place, vertical, iconSize, appWidth, appDesc);
}

PlaceButton.prototype = {
   __proto__: PlaceButtonAccessible.prototype,

   _init: function(parent, parentScroll, place, vertical, iconSize, appWidth, appDesc) {
      PlaceButtonAccessible.prototype._init.call(this, parent, parentScroll, place, "", vertical, iconSize, appWidth, appDesc);
      this.actor._delegate = this;
   },

   get_app_id: function() {
      return this.app.get_id();
   },
    
   getDragActor: function() {
      let icon_size = this.iconSize;
      // if(this.iconSizeDrag < this.iconSize)
      //    icon_size = this.iconSizeDrag;
      return this.app.create_icon_texture(icon_size);
   },

   // Returns the original actor that should align with the actor
   // we show as the item is being dragged.
   getDragActorSource: function() {
      return this.actor;
   },

   _onButtonReleaseEvent: function (actor, event) {
      if(!this.parent.pressed) {
         if(event.get_button()==1) {
            this.activate(event);
         }
         if(event.get_button()==3) {
            if((this.withMenu) && (!this.menu.isOpen)) {
               this.parent.closeApplicationsContextMenus(true);
               this.parent._previousContextMenuOpen = this;
            }
            //Main.notify("nnoo " + this.withMenu);
            this.toggleMenu();
         }
      }
      //this.parent._disableResize();
      return true;
   },
};

function RecentButton(parent, parentScroll, file, vertical, iconSize, appWidth, appDesc) {
   this._init(parent, parentScroll, file, vertical, iconSize, appWidth, appDesc);
}

RecentButton.prototype = {
   __proto__: ConfigurableMenus.ConfigurablePopupSubMenuMenuItem.prototype,

   _init: function(parent, parentScroll, file, vertical, iconSize, appWidth, appDesc) {
      ConfigurableMenus.ConfigurablePopupBaseMenuItem.prototype._init.call(this, {hover: false});

      this.iconSize = iconSize;
      this.file = file;
      this.parent = parent;
      this.parentScroll = parentScroll;
      this.button_name = this.file.name;
      this.actor.set_style_class_name('menu-application-button');
      this.actor._delegate = this;
      this.labelName = new St.Label({ text: this.button_name, style_class: 'menu-application-button-label' });
      this.labelDesc = new St.Label({ style_class: 'menu-application-button-label' });
      this.labelDesc.visible = false;
      this.container = new St.BoxLayout();
      this.textBox = new St.BoxLayout({ vertical: true });
      this.setTextMaxWidth(appWidth);
      this.setAppDescriptionVisible(appDesc);
      this.setVertical(vertical);
      this.icon = file.createIcon(this.iconSize);
      if(this.icon) {
         this.container.add(this.icon, { x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE, x_fill: false, y_fill: false, expand: false });
         this.icon.realize();
      }
      this.container.add(this.textBox, { x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE, x_fill: false, y_fill: false, expand: false });
      this.addActor(this.container);

      this.labelName.realize();
      this.labelDesc.realize();

      this.menu = new ConfigurableMenus.ConfigurableMenu(this, 0.0, St.Side.LEFT, false);
      this.menu.actor.set_style_class_name('menu-context-menu');
      this.menu.connect('open-state-changed', Lang.bind(this, this._subMenuOpenStateChanged));
   },

   _subMenuOpenStateChanged: function() {
      if(this.menu.isOpen) {
         this.parentScroll.scrollToActor(this.menu.actor);
      }
   },

   _onKeyPressEvent: function(actor, event) {
      let symbol = event.get_key_symbol();

      //if(symbol == Clutter.KEY_space) {
      //   if((this.withMenu) && (!this.menu.isOpen)) {
      //      this.parent.closeApplicationsContextMenus(true);
      //   }
      //   this.toggleMenu();
      //   return true;
      //}
      return ConfigurableMenus.ConfigurablePopupBaseMenuItem.prototype._onKeyPressEvent.call(this, actor, event);
   },

   closeMenu: function() {
      if(this.widthC) {
         this.parent.menu.actor.set_width(this.widthC);
         this.parent.width = this.widthC;
         this.widthC = null;
      }
      this.menu.close();
   },

   toggleMenu: function() {
      if(!this.menu.isOpen) {
         let children = this.menu.box.get_children();
         for(let i in children) {
            this.menu.box.remove_actor(children[i]);
         }
         let menuItem;
         if (GLib.find_program_in_path("nemo-open-with") != null) {
            menuItem = new ApplicationContextMenuItem(this, "open_with", _("Open with "),//_("Other application..."),
                                                              null, "nemo-open-with " + this.file.uri);
            this.menu.addMenuItem(menuItem);
         }
         let appCinMimeDef = this.getDefaultAppForMime();
         if(appCinMimeDef) {
            menuItem = new ApplicationContextMenuItem(this, "open_with", appCinMimeDef.get_name(),
                                                              appCinMimeDef.create_icon_texture(20), appCinMimeDef.get_id());
            menuItem.actor.style = "font-weight: bold";
            this.menu.addMenuItem(menuItem);
         }
         let appCinMime = this.getAppForMime(appCinMimeDef);
         for(let app in appCinMime) {
            menuItem = new ApplicationContextMenuItem(this, "open_with", appCinMime[app].get_name(),
                                                              appCinMime[app].create_icon_texture(20), appCinMime[app].get_id());
            this.menu.addMenuItem(menuItem);
         }
      }
      this.menu.toggle();
   },

   launch: function(id_mime) {
      try {
         let appSys = Cinnamon.AppSystem.get_default();
         let appSysMime = appSys.lookup_app(id_mime);
         if(appSysMime)
            appSysMime.launch(global.create_app_launch_context(), [this.file.uri], null);
         else
            Util.spawnCommandLine(id_mime);
      } catch(e) {
         global.logError(e);
      }
   },

   hasLocalPath: function(file) {
      return file.is_native() || file.get_path() != null;
   },

   getDefaultAppForMime: function() {
      let file = Gio.File.new_for_uri(this.file.uri);
      let default_info = Gio.AppInfo.get_default_for_type(this.file.mimeType, !this.hasLocalPath(file));

      if (default_info) {
         let appSys = Cinnamon.AppSystem.get_default();
         return appSys.lookup_app(default_info.get_id())
      }
      return null;
   },

   getAppForMime: function(default_app) {
      let appCinMime = new Array();
      if(this.file.mimeType) {
         try {
            let appSysMime = Gio.app_info_get_all_for_type(this.file.mimeType);
            let appSys = Cinnamon.AppSystem.get_default();
            let app;
            for(let app in appSysMime) {
               app = appSys.lookup_app(appSysMime[app].get_id());
               if((app)&&(app != default_app))
                  appCinMime.push(app);
            }
         } catch(e) {
            global.logError(e);
         }
      }
      return appCinMime;
   },

   _onButtonReleaseEvent: function (actor, event) {
      if(!this.parent.pressed) {
         if(event.get_button()==1) {
            //This is new on 2.2
            //this.file.launch();
            Gio.app_info_launch_default_for_uri(this.file.uri, global.create_app_launch_context());
            this.parent.menu.close();
         }
         if(event.get_button()==3) {
            if(!this.menu.isOpen) {
               this.parent.closeApplicationsContextMenus(true);
               let box = this.actor.get_parent();
               if((this.parent.appMenu)&&(this.parent.applicationsBox == box.get_parent().get_parent())) {
                  let boxH = box.get_height();
                  let monitor = Main.layoutManager.findMonitorForActor(box);
                  if(boxH > monitor.height - 100)
                     boxH = monitor.height - 100;
                  box.set_height(boxH);
                  this.widthC = null;
                  this.toggleMenu();
                  if(this.parent.appMenu) {
                     this.actor.get_parent().set_height(-1);
                  }
                  this.parent._updateSubMenuSize();
               } else {
                  this.toggleMenu();
                  this.parent._updateSize();
               }
               this.parent._previousContextMenuOpen = this;
            } else {
               this.closeMenu();
            }
         }
      }
      //this.parent._disableResize();
      return true;
   },

   activate: function(event) {
      Gio.app_info_launch_default_for_uri(this.file.uri, global.create_app_launch_context());
      //this.file.launch();
      this.parent.menu.close();
   },

   setIconSize: function(iconSize) {
      this.iconSize = iconSize;
      if(this.icon)
         this.icon.set_icon_size(this.iconSize);
   },

   setTextMaxWidth: function(maxWidth) {
      //this.textBox.set_width(maxWidth);
      this.textBox.style = "max-width: "+maxWidth+"px;";
      this.textWidth = maxWidth;
   },

   getName: function() {
      return this.button_name;
   },

   getDescription: function() {
      return this.labelDesc.get_text();
   },

   setAppDescriptionVisible: function(visible) {
      this.labelDesc.visible = visible;
      let text = this.file.uri.slice(7);
      try {
         if(text)
            this.labelDesc.set_text(decodeURIComponent(text));
      } catch(e) {
         Main.notify("Error on decode, the encode of the text are unsupported", e.message);
         if(text)
            this.labelDesc.set_text(text);
      }
   },

   setVertical: function(vertical) {
      this.container.set_vertical(vertical);
      let parentL = this.labelName.get_parent();
      if(parentL) parentL.remove_actor(this.labelName);
      parentL = this.labelDesc.get_parent();
      if(parentL) parentL.remove_actor(this.labelDesc);
      this.setTextMaxWidth(this.textWidth);
      if(vertical) {
         this.textBox.add(this.labelName, { x_align: St.Align.MIDDLE, x_fill: false, y_fill: false, expand: true });
         this.textBox.add(this.labelDesc, { x_align: St.Align.MIDDLE, x_fill: false, y_fill: false, expand: true });  
      }
      else {
         this.textBox.add(this.labelName, { x_align: St.Align.START, x_fill: false, y_fill: false, expand: true });
         this.textBox.add(this.labelDesc, { x_align: St.Align.START, x_fill: false, y_fill: false, expand: true });
      }
   }
};

function RecentClearButton(parent, vertical, iconSize, appWidth, appDesc) {
   this._init(parent, vertical, iconSize, appWidth, appDesc);
}

RecentClearButton.prototype = {
   __proto__: ConfigurableMenus.ConfigurablePopupBaseMenuItem.prototype,

   _init: function(parent, vertical, iconSize, appWidth, appDesc) {
      ConfigurableMenus.ConfigurablePopupBaseMenuItem.prototype._init.call(this, {hover: false});
      this.iconSize = iconSize;
      this.parent = parent;
      this.actor.set_style_class_name('menu-application-button');
      this.button_name = _("Clear list");
      this.actor._delegate = this;
      this.labelName = new St.Label({ text: this.button_name, style_class: 'menu-application-button-label' });
      this.labelDesc = new St.Label({ style_class: 'menu-application-button-label' });
      this.labelDesc.visible = false;
      this.container = new St.BoxLayout();
      this.textBox = new St.BoxLayout({ vertical: true });
      this.setTextMaxWidth(appWidth);
      this.setAppDescriptionVisible(appDesc);
      this.setVertical(vertical);

      this.icon = new St.Icon({ icon_name: 'edit-clear', icon_type: St.IconType.SYMBOLIC, icon_size: this.iconSize });
      this.container.add(this.icon, { x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE, x_fill: false, y_fill: false, expand: false });
      this.container.add(this.textBox, { x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE, x_fill: false, y_fill: false, expand: false });

      this.addActor(this.container);      
      this.icon.realize();
      this.labelName.realize();
      this.labelDesc.realize();
   },

   _onButtonReleaseEvent: function (actor, event) {
      if(event.get_button() == 1) {
         this.parent.menu.close();
         let GtkRecent = new Gtk.RecentManager();
         GtkRecent.purge_items();
      }
   },

   getName: function() {
      return this.button_name;
   },

   activate: function(event) {
      this.parent.menu.close();
      let GtkRecent = new Gtk.RecentManager();
      GtkRecent.purge_items();
   },

   setIconSize: function (iconSize) {
      this.iconSize = iconSize;
      if(this.icon)
         this.icon.set_icon_size(this.iconSize);
   },

   setTextMaxWidth: function(maxWidth) {
      //this.textBox.set_width(maxWidth);
      this.textBox.style = "max-width: "+maxWidth+"px;";
      this.textWidth = maxWidth;
   },

   setAppDescriptionVisible: function(visible) {
      this.labelDesc.visible = visible;
      this.labelDesc.set_text("");
   },

   setVertical: function(vertical) {
      this.container.set_vertical(vertical);
      let parentL = this.labelName.get_parent();
      if(parentL) parentL.remove_actor(this.labelName);
      parentL = this.labelDesc.get_parent();
      if(parentL) parentL.remove_actor(this.labelDesc);
      this.setTextMaxWidth(this.textWidth);
      if(vertical) {
         this.textBox.add(this.labelName, { x_align: St.Align.MIDDLE, x_fill: false, y_fill: false, expand: true });
         this.textBox.add(this.labelDesc, { x_align: St.Align.MIDDLE, x_fill: false, y_fill: false, expand: true });  
      }
      else {
         this.textBox.add(this.labelName, { x_align: St.Align.START, x_fill: false, y_fill: false, expand: true });
         this.textBox.add(this.labelDesc, { x_align: St.Align.START, x_fill: false, y_fill: false, expand: true });
      }
   }
};

function TransientButton(parent, parentScroll, pathOrCommand, iconSize, vertical, appWidth, appdesc) {
   this._init(parent, parentScroll, pathOrCommand, iconSize, vertical, appWidth, appdesc);
}

TransientButton.prototype = {
   __proto__: GenericApplicationButton.prototype,
    
   _init: function(parent, parentScroll, pathOrCommand, iconSize, vertical, appWidth, appdesc) {
      GenericApplicationButton.prototype._init.call(this, parent, parentScroll, this._createAppWrapper(pathOrCommand), false);
      this.iconSize = iconSize;
      if(pathOrCommand.charAt(0) == '~') {
         pathOrCommand = pathOrCommand.slice(1);
         pathOrCommand = GLib.get_home_dir() + pathOrCommand;
      }

      this.isPath = pathOrCommand.substr(pathOrCommand.length - 1) == '/';
      if(this.isPath) {
         this.path = pathOrCommand;
      } else {
         let n = pathOrCommand.lastIndexOf('/');
         if(n != 1) {
            this.path = pathOrCommand.substr(0, n);
         }
      }

      this.pathOrCommand = pathOrCommand;

      this.parent = parent;
      ConfigurableMenus.ConfigurablePopupBaseMenuItem.prototype._init.call(this, {hover: false});

      let iconBox = new St.Bin();
      this.file = Gio.file_new_for_path(this.pathOrCommand);
      try {
         this.handler = this.file.query_default_handler(null);
         let icon_uri = this.file.get_uri();
         let fileInfo = this.file.query_info(Gio.FILE_ATTRIBUTE_STANDARD_TYPE, Gio.FileQueryInfoFlags.NONE, null);
         let contentType = Gio.content_type_guess(this.pathOrCommand, null);
         let themedIcon = Gio.content_type_get_icon(contentType[0]);
         this.icon = new St.Icon({gicon: themedIcon, icon_size: this.iconSize, icon_type: St.IconType.FULLCOLOR });
      } catch (e) {
         this.handler = null;
         let iconName = this.isPath ? 'folder' : 'unknown';
         this.icon = new St.Icon({icon_name: iconName, icon_size: this.iconSize, icon_type: St.IconType.FULLCOLOR });
         // @todo Would be nice to indicate we don't have a handler for this file.
      }
      this.actor.set_style_class_name('menu-application-button');

      

      this.labelName = new St.Label({ text: this.app.get_description(), style_class: 'menu-application-button-label' });
      this.labelDesc = new St.Label({ style_class: 'menu-application-button-label' });
      this.labelDesc.visible = false;
      this.container = new St.BoxLayout();
      this.textBox = new St.BoxLayout({ vertical: true });
      this.setTextMaxWidth(appWidth);
      this.setAppDescriptionVisible(appdesc);
      this.setVertical(vertical);

      this.textBox.add(this.labelName, { x_align: St.Align.MIDDLE, x_fill: false, y_fill: false, expand: true });
      if(this.icon) {
         this.container.add(this.icon, { x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE, x_fill: false, y_fill: false, expand: false });
         this.icon.realize();
      }
      this.container.add(this.textBox, { x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE, x_fill: false, y_fill: false, expand: false });
      this.addActor(this.container);

      this.labelName.realize();
      this.labelDesc.realize();
      this.isDraggableApp = false;
    //  this._draggable = DND.makeDraggable(this.actor);
    //  this._draggable.connect('drag-end', Lang.bind(this, this._onDragEnd));
    //  this.isDraggableApp = true;
   },

   _onButtonReleaseEvent: function(actor, event) {
      if(event.get_button() == 1) {
         this.activate(event);
      }
      return true;
   },
    
   activate: function(event) {
      if(this.handler != null) {
         this.handler.launch([this.file], null);
      } else {
         // Try anyway, even though we probably shouldn't.
         try {
            Util.spawn(['gvfs-open', this.file.get_uri()]);
         } catch(e) {
            global.logError("No handler available to open " + this.file.get_uri());
         }   
      }
      this.parent.menu.close();
   },

   setIconSize: function (iconSize) {
      this.iconSize = iconSize;
      if(this.icon)
         this.icon.set_icon_size(this.iconSize);
   },

   setAppDescriptionVisible: function(visible) {
      this.labelDesc.visible = visible;
      this.labelDesc.set_text("");
   },

   setTextMaxWidth: function(maxWidth) {
      //this.textBox.set_width(maxWidth);
      this.textBox.style = "max-width: "+maxWidth+"px;";
      this.textWidth = maxWidth;
   },

   setVertical: function(vertical) {
      this.container.set_vertical(vertical);
      let parentL = this.labelName.get_parent();
      if(parentL) parentL.remove_actor(this.labelName);
      parentL = this.labelDesc.get_parent();
      if(parentL) parentL.remove_actor(this.labelDesc);
      this.setTextMaxWidth(this.textWidth);
      if(vertical) {
         this.textBox.add(this.labelName, { x_align: St.Align.MIDDLE, x_fill: false, y_fill: false, expand: true });
         this.textBox.add(this.labelDesc, { x_align: St.Align.MIDDLE, x_fill: false, y_fill: false, expand: true });  
      }
      else {
         this.textBox.add(this.labelName, { x_align: St.Align.START, x_fill: false, y_fill: false, expand: true });
         this.textBox.add(this.labelDesc, { x_align: St.Align.START, x_fill: false, y_fill: false, expand: true });
      }
   },

   _onDragEnd: function() {
   //   let [x, y, mask] = global.get_pointer();
   //   let reactiveActor = global.stage.get_actor_at_pos(Clutter.PickMode.REACTIVE, x, y);
   //   let allActor = global.stage.get_actor_at_pos(Clutter.PickMode.ALL, x, y);
   //   let typeName = "" + allActor;
   //   if((reactiveActor instanceof Clutter.Stage)&&(typeName.indexOf("MetaWindowGroup") != -1)) {
   //      try {
   //         if(this.app.isPlace) {
   //            this.app.make_desktop_file();
   //         } else {
   //            let file = Gio.file_new_for_path(this.app.get_app_info().get_filename());
   //            let destFile = Gio.file_new_for_path(USER_DESKTOP_PATH+"/"+this.app.get_id());
   //            file.copy(destFile, 0, null, function(){});
               // Need to find a way to do that using the Gio library, but modifying the access::can-execute attribute on the file object seems unsupported
   //            Util.spawnCommandLine("chmod +x \""+USER_DESKTOP_PATH+"/"+this.app.get_id()+"\"");
   //         }
   //         this.parent._refreshFavs();
   //         this.parent._onChangeAccessible();
   //         return true;
   //      } catch(e) {
   //         //Main.notify("err:", e.message);
   //         global.log(e);
   //      }
   //   }
   //   this.parent._refreshFavs();
   //   this.parent._onChangeAccessible();
      return false;
   },

  _createAppWrapper: function(pathOrCommand) {
      // We need this fake app to help appEnterEvent/appLeaveEvent 
      // work with our search result.
      this.app = {
         get_app_info: function() {
            this.appInfo = {
               get_filename: function() {
                  try {
                     return decodeURIComponent(pathOrCommand);
                  } catch(e) {
                     Main.notify("Error on decode, the encode of the text are unsupported", e.message);
                  }
                  return pathOrCommand;
               }
            };
            return this.appInfo;
         },
         get_id: function() {
            return -1;
         },
         get_description: function() {
            try {
               return decodeURIComponent(pathOrCommand);
            } catch(e) {
               Main.notify("Error on decode, the encode of the text are unsupported", e.message);
            }
            return pathOrCommand;
         },
         get_name: function() {
            return  '';
         },
         is_window_backed: function() {
            return false;
         },
         create_icon_texture: function(appIconSize) {
            try {
               let contentType = Gio.content_type_guess(pathOrCommand, null);
               let themedIcon = Gio.content_type_get_icon(contentType[0]);
               return new St.Icon({gicon: themedIcon, icon_size: appIconSize, icon_type: St.IconType.FULLCOLOR });
            } catch (e) {
               let isPath = pathOrCommand.substr(pathOrCommand.length - 1) == '/';
               let iconName = isPath ? 'folder' : 'unknown';
               return new St.Icon({icon_name: iconName, icon_size: appIconSize, icon_type: St.IconType.FULLCOLOR });
            }
         }
      };
      return this.app;
   }
};

function FavoritesButton(parent, parentScroll, vertical, displayVertical, app, alterText, nbFavorites, iconSize, allowName, appTextWidth, appDesc, appWidth) {
   this._init(parent, parentScroll, vertical, displayVertical, app, alterText, nbFavorites, iconSize, allowName, appTextWidth, appDesc, appWidth);
}

FavoritesButton.prototype = {
   __proto__: GenericApplicationButton.prototype,
    
   _init: function(parent, parentScroll, vertical, displayVertical, app, alterName, nbFavorites, iconSize, allowName, appTextWidth, appDesc, appWidth) {
      GenericApplicationButton.prototype._init.call(this, parent, parentScroll, app, true);
      this.iconSize = iconSize;
      this.displayVertical = displayVertical;
      this.vertical = vertical;
      this.allowName = allowName;
      this.nbFavorites = nbFavorites;
      this.alterName = alterName;
      this.appWidth = appWidth;

      this.container = new St.BoxLayout();
      let icon_size = this.iconSize;
      if(!this.allowName) {
         let monitor = Main.layoutManager.primaryMonitor;
         let monitorHeight;
         if(this.displayVertical)
            monitorHeight = monitor.height;
         else
            monitorHeight = monitor.width;
         let real_size = (0.7*monitorHeight) / this.nbFavorites;
         if(global.ui_scale) icon_size = 0.6*real_size/global.ui_scale;
         else icon_size = 0.6*real_size;
         if(icon_size > this.iconSize) icon_size = this.iconSize;
      }
      this.actor.set_style_class_name('menu-favorites-button');
      this.icon = app.create_icon_texture(icon_size);
      
      if(this.allowName) {
         if(this.icon) {
            this.container.add(this.icon, { x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE, x_fill: false, y_fill: false, expand: false });
            this.icon.realize();
         }
         this.nameEntry = new St.Entry({ name: 'menu-name-entry', hint_text: _("Type the new name..."), track_hover: true, can_focus: true });
         if((this.alterName)&&(this.alterName != ""))
            this.labelName = new St.Label({ text: this.alterName, style_class: 'menu-application-button-label' });
         else
            this.labelName = new St.Label({ text: this.app.get_name(), style_class: 'menu-application-button-label' });
         this.labelDesc = new St.Label({ style_class: 'menu-application-button-label' });
         this.nameEntry.visible = false;
         this.labelDesc.visible = false;

         this.textBox = new St.BoxLayout({ vertical: true });
         this.setTextMaxWidth(appTextWidth);
         this.setAppDescriptionVisible(appDesc);
         this.container.add(this.textBox, { x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE, x_fill: false, y_fill: false, expand: false });
         this.setVertical(vertical);
         this.labelName.realize();
         this.labelDesc.realize();
      } else if(this.icon) {
         this.container.add(this.icon, { x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE, x_fill: false, y_fill: false, expand: true });
         this.icon.realize();
      }
      this.addActor(this.container);
      this.actor._delegate = this;
      this._draggable = DND.makeDraggable(this.actor);
      this._draggable.connect('drag-end', Lang.bind(this, this._onDragEnd));  
      this.isDraggableApp = true;
   },

   setWidthApp: function() {
      this.container.set_width(this.appWidth);
   },

   editText: function(edit) {
      if((edit)&&(!this.nameEntry.visible)) {
         this.nameEntry.set_text(this.labelName.get_text());
         this.nameEntry.visible = true;
         global.stage.set_key_focus(this.nameEntry);
         this.labelName.visible = false;
         this.labelDesc.visible = false;
      }
      else {
         if(this.nameEntry.get_text() != "") {
            global.stage.set_key_focus(this.parent.searchEntry);
            this.labelName.set_text(this.nameEntry.get_text());
            this.alterName = this.nameEntry.get_text();
            this.nameEntry.set_text("");
            this.parent.changeAppName(this.app.get_id(), this.alterName);
         } else
            global.stage.set_key_focus(this.actor);

         this.labelName.visible = true;
         this.labelDesc.visible = this.haveDesc;
         this.nameEntry.visible = false;
      }
   },

   setDefaultText: function() {
      global.stage.set_key_focus(this.parent.searchEntry);
      this.labelName.set_text(this.app.get_name());
      this.alterName = "";
      this.nameEntry.set_text("");
      this.parent.changeAppName(this.app.get_id(), this.alterName);
      this.labelName.visible = true;
      this.labelDesc.visible = this.haveDesc;
      this.nameEntry.visible = false;
   },

   setIconVisible: function(visible) {
      if(this.icon)
         this.icon.visible = visible;
   },

   setIconSize: function(iconSize) {
      this.iconSize = iconSize;
      if(this.icon) {
         if(!this.allowName) {
            let monitor = Main.layoutManager.findMonitorForActor(this.actor);
            let monitorHeight;
            if(this.displayVertical)
               monitorHeight = monitor.height;
            else
               monitorHeight = monitor.width;
            let real_size = (0.7*monitorHeight) / this.nbFavorites;
            let icon_size = 0.7*real_size;
            if(icon_size > this.iconSize) icon_size = this.iconSize;
         }
         let visible = this.icon.visible;
         let parentIcon = this.icon.get_parent();
         if(parentIcon)
            parentIcon.remove_actor(this.icon);
         this.icon.destroy();
         this.icon = this.app.create_icon_texture(this.iconSize);
         if(this.icon) {
            this.container.insert_actor(this.icon, 0);
            this.icon.visible = visible;
         }
      }
   },

   setTextMaxWidth: function(maxWidth) {
      //this.textBox.set_width(maxWidth);
      this.textBox.style = "max-width: "+maxWidth+"px;";
      this.textWidth = maxWidth;
   },

   setAppDescriptionVisible: function(visible) {
      this.haveDesc = visible;
      if(this.allowName) { 
         this.labelDesc.visible = visible;
         if(this.app.get_description())
            this.labelDesc.set_text(this.app.get_description().split("\n")[0]);
      }
   },

   setVertical: function(vertical) {
      this.container.set_vertical(vertical);
      this.setTextMaxWidth(this.textWidth);
      if(this.allowName) {      
         let parentL = this.labelName.get_parent();
         if(parentL) parentL.remove_actor(this.labelName);
         parentL = this.labelDesc.get_parent();
         if(parentL) parentL.remove_actor(this.labelName);
         parentL = this.nameEntry.get_parent();
         if(parentL) parentL.remove_actor(this.nameEntry);
         if(vertical) {
            this.textBox.add(this.labelName, { x_align: St.Align.MIDDLE, x_fill: false, y_fill: false, expand: true });
            this.textBox.add(this.nameEntry, { x_align: St.Align.MIDDLE, x_fill: false, y_fill: false, expand: true });  
            this.textBox.add(this.labelDesc, { x_align: St.Align.MIDDLE, x_fill: false, y_fill: false, expand: true });
            
         }
         else {
            this.textBox.add(this.labelName, { x_align: St.Align.START, x_fill: false, y_fill: false, expand: true });
            this.textBox.add(this.nameEntry, { x_align: St.Align.START, x_fill: false, y_fill: false, expand: true });
            this.textBox.add(this.labelDesc, { x_align: St.Align.START, x_fill: false, y_fill: false, expand: true });
         }
      }
   },

   _onDragEnd: function(actor, time, acepted) {
      let [x, y, mask] = global.get_pointer();
      let reactiveActor = global.stage.get_actor_at_pos(Clutter.PickMode.REACTIVE, x, y);
      let allActor = global.stage.get_actor_at_pos(Clutter.PickMode.ALL, x, y);
      let typeName = "" + allActor;
      if((reactiveActor instanceof Clutter.Stage)&&(typeName.indexOf("MetaWindowGroup") != -1)) {
         try {
            if(this.app.isPlace) {
               this.app.make_desktop_file();
            } else {
               let file = Gio.file_new_for_path(this.app.get_app_info().get_filename());
               let destFile = Gio.file_new_for_path(USER_DESKTOP_PATH+"/"+this.app.get_id());
               file.copy(destFile, 0, null, function(){});
               // Need to find a way to do that using the Gio library, but modifying the access::can-execute attribute on the file object seems unsupported
               Util.spawnCommandLine("chmod +x \""+USER_DESKTOP_PATH+"/"+this.app.get_id()+"\"");
            }
            this.parent._refreshFavs();
            this.parent._onChangeAccessible();
            return true;
         } catch(e) {
            //Main.notify("err:", e.message);
            global.log(e);
         }
      }
      this.parent._refreshFavs();
      this.parent._onChangeAccessible();
      return false;
   }
};

function SystemButton(parent, parentScroll, icon, title, description, iconSize, haveText) {
   this._init(parent, parentScroll, icon, title, description, iconSize, haveText);
}

SystemButton.prototype = {
   __proto__: GenericApplicationButton.prototype,

   _init: function(parent, parentScroll, icon, title, description, iconSize, haveText) {
      GenericApplicationButton.prototype._init.call(this, parent, parentScroll);
      this.title = title;
      this.description = description;
      this.actor.destroy();
      this.actor = new St.BoxLayout({ style_class:'menu-category-button', reactive: true, track_hover: true });
      this.iconSize = iconSize;
      this.icon = icon;
      this.title = title;
      this.description = description;
      this.active = false;
      
      this.container = new St.BoxLayout();
      this.iconObj = new St.Icon({icon_name: icon, icon_size: this.iconSize, icon_type: St.IconType.FULLCOLOR });
      if(this.iconObj) {
         this.container.add(this.iconObj, { x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE, x_fill: false, y_fill: false, expand: false });
         this.iconObj.realize();
      }

      this.label = new St.Label({ text: this.title, style_class: 'menu-application-button-label' });
      this.label.clutter_text.line_wrap_mode = Pango.WrapMode.CHAR;//WORD_CHAR;
      this.label.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;//END;
      this.label.clutter_text.set_line_alignment(Pango.Alignment.CENTER);
      this.textBox = new St.BoxLayout({ vertical: false });
      this.textBox.add(this.label, { x_align: St.Align.MIDDLE, x_fill: false, y_fill: false, expand: true });
      this.setTextVisible(false);
      this.setIconVisible(true);
      this.container.add_actor(this.textBox);
      this.label.realize();

      this.actor.add(this.container, { x_align: St.Align.MIDDLE, x_fill: false, y_fill: false, expand: true });
      this.actor._delegate = this;
   },

   setIconSymbolic: function(symbolic) {
      if(this.iconObj) {
         if(symbolic)
            this.iconObj.set_icon_type(St.IconType.SYMBOLIC);
         else
            this.iconObj.set_icon_type(St.IconType.FULLCOLOR);
      }
   },

   setIconVisible: function(haveIcon) {
      if(this.iconObj) {
         this.iconObj.visible = haveIcon;
      }
   },

   setTheme: function(theme) {
      this.theme = theme;
      this.actor.set_style_class_name('menu-category-button');
      this.actor.add_style_class_name('menu-system-button-' + this.theme);
   },

   setTextVisible: function(haveText) {
      this.textBox.visible = haveText;
   },

   setVertical: function(vertical) {
      this.actor.remove_actor(this.container);
      if(vertical)
         this.actor.add(this.container, { x_align: St.Align.MIDDLE, x_fill: false, y_fill: false, expand: true });
      else
         this.actor.add(this.container, { x_align: St.Align.START, x_fill: false, y_fill: false, expand: true });
       this.container.set_vertical(vertical);
   },

   setIconSize: function(iconSize) {
      this.iconSize = iconSize;
      if((this.icon)&&(this.iconObj)) {
         this.iconObj.set_icon_size(this.iconSize);
         this.iconObj.realize();
      }
   },

   setAction: function(actionCallBack) {
      this.actionCallBack = actionCallBack;
      this.actor.connect('button-press-event', Lang.bind(this, this.executeAction));
   },

   executeAction: function(actor, event) {
      if((this.actionCallBack)&&((!event)||(event.get_button()==1))) {
         this.setActive(false);
         this.actionCallBack();
      }
   },

   setActive: function(active) {
      if(this.active != active) {
         this.active = active;
         if(this.active) {
            this.actor.set_style_class_name('menu-category-button-selected');
            if(this.theme)
               this.actor.add_style_class_name('menu-system-button-' + this.theme + '-selected');
            this.actor.add_style_pseudo_class('active');
         }
         else {
            this.actor.set_style_class_name('menu-category-button');
            if(this.theme)
               this.actor.add_style_class_name('menu-system-button-' + this.theme);
            this.actor.remove_style_pseudo_class('active');
         }
         this.emit('active-changed', active);
      }
   }
};
//Signals.addSignalMethods(SystemButton.prototype);

function SearchItem(parent, provider, search_path, icon_path, iconSize, textWidth, appDesc, vertical) {
   this._init(parent, provider, search_path, icon_path, iconSize, textWidth, appDesc, vertical);
}

SearchItem.prototype = {
   __proto__: ConfigurableMenus.ConfigurablePopupBaseMenuItem.prototype,

   _init: function(parent, provider, path, icon_path, iconSize, textWidth, appDesc, vertical) {
      ConfigurableMenus.ConfigurablePopupBaseMenuItem.prototype._init.call(this);
      this.actor.set_style_class_name('menu-application-button');
      this.iconSize = iconSize;
      this.parent = parent;
      this.provider = provider;
      this.path = path;
      this.string = "";
      let fileIcon = Gio.file_new_for_path(icon_path);
      this.icon_uri = fileIcon.get_uri();
      this.app = this._createAppWrapper(provider, path, icon_path);
      this.name = this.app.get_name();
      this.labelName = new St.Label({ text: this.name , style_class: 'menu-application-button-label' });
      this.labelDesc = new St.Label({ style_class: 'menu-application-button-label' });
      this.labelDesc.visible = false;
      this.container = new St.BoxLayout();
      this.textBox = new St.BoxLayout({ vertical: true });
      this.setTextMaxWidth(textWidth);
      this.setAppDescriptionVisible(appDesc);
      this.setVertical(vertical);

      this.icon = this.app.create_icon_texture(this.iconSize);
      // St.TextureCache.get_default().load_uri_async(this.icon_uri, this.iconSize, this.iconSize);
      if(this.icon) {
         this.container.add(this.icon, { x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE, x_fill: false, y_fill: false, expand: false });
         this.icon.realize();
      }
      this.container.add(this.textBox, { x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE, x_fill: false, y_fill: false, expand: false });
      this.addActor(this.container);

      this.labelName.realize();
      this.labelDesc.realize();
      this.isDraggableApp = false;
   },

   setIconSize: function (iconSize) {
      this.iconSize = iconSize;
      if(this.icon) {
         let visible = this.icon.visible; 
         let parentIcon = this.icon.get_parent();
         if(parentIcon)
            parentIcon.remove_actor(this.icon);
         this.icon.destroy();
         this.icon = this.app.create_icon_texture(this.iconSize);
         this.icon.visible = visible;
         this.container.insert_actor(this.icon, 0);
      }
   },

   setAppDescriptionVisible: function(visible) {
      this.labelDesc.visible = visible;
      if(this.app.get_description())
         this.labelDesc.set_text(this.app.get_description().split("\n")[0]);
   },

   setTextMaxWidth: function(maxWidth) {
      //this.textBox.set_width(maxWidth);
      this.textBox.style = "max-width: "+maxWidth+"px;";
      this.textWidth = maxWidth;
   },

   setVertical: function(vertical) {
      this.container.set_vertical(vertical);
      let parentL = this.labelName.get_parent();
      if(parentL) parentL.remove_actor(this.labelName);
      parentL = this.labelDesc.get_parent();
      if(parentL) parentL.remove_actor(this.labelDesc);
      this.setTextMaxWidth(this.textWidth);
      if(vertical) {
         this.textBox.add(this.labelName, { x_align: St.Align.MIDDLE, x_fill: false, y_fill: false, expand: true });
         this.textBox.add(this.labelDesc, { x_align: St.Align.MIDDLE, x_fill: false, y_fill: false, expand: true });  
      }
      else {
         this.textBox.add(this.labelName, { x_align: St.Align.START, x_fill: false, y_fill: false, expand: true });
         this.textBox.add(this.labelDesc, { x_align: St.Align.START, x_fill: false, y_fill: false, expand: true });
      }
   },

   setActive: function(active){
      if(active)
         this.actor.set_style_class_name("menu-application-button-selected");
      else
         this.actor.set_style_class_name('menu-application-button');
   },

   setString: function(string) {
      this.string = string;
      let webText = _("Search %s for %s").format(this.provider, string);
      this.labelName.set_text(webText);
   },

   activate: function(event){
      while(this.string.indexOf(" ")!= -1) {
         this.string = this.string.replace(" ", "%20");
      }

      Util.spawnCommandLine("xdg-open " + this.path + this.string);
      this.parent.toggle();
   },

   _createAppWrapper: function(provider, pathOrCommand, icon_path) {
      // We need this fake app to help appEnterEvent/appLeaveEvent 
      // work with our search result.
      this.app = {
         get_app_info: function() {
            this.appInfo = {
               get_filename: function() {
                  return pathOrCommand;
               }
            };
            return this.appInfo;
         },
         get_id: function() {
            return provider;
         },
         get_description: function() {
            return pathOrCommand;
         },
         get_name: function() {
            return  provider;
         },
         is_window_backed: function() {
            return false;
         },
         create_icon_texture: function(appIconSize) {
            try {
              let gicon = new Gio.FileIcon({ file: Gio.file_new_for_path(icon_path) });
              return  new St.Icon({gicon: gicon, icon_size: appIconSize, icon_type: St.IconType.FULLCOLOR});
            } catch (e) {}
            return null;
         }
      };
      return this.app;
   }
};

function DriveMenuItem(parent, selectedAppBox, hover, place, iconSize, iconVisible) {
   this._init(parent, selectedAppBox, hover, place, iconSize, iconVisible);
}

DriveMenuItem.prototype = {
   __proto__: ConfigurableMenus.ConfigurablePopupBaseMenuItem.prototype,

   _init: function(parent, selectedAppBox, hover, place, iconSize, iconVisible) {
      ConfigurableMenus.ConfigurablePopupBaseMenuItem.prototype._init.call(this, {hover: false, sensitive: false, focusOnHover: false});
      this.place = place;
      this.iconSize = iconSize;
      this.parent = parent;
      this.selectedAppBox = selectedAppBox;
      this.hover = hover;

      this.actor.destroy();
      this.actor = new St.BoxLayout({ style_class: 'menu-application-button', vertical: false, reactive: true, track_hover: true });
      this.actor.connect('button-release-event', Lang.bind(this, this._onButtonReleaseEvent));
      this.actor.connect('key-press-event', Lang.bind(this, this._onKeyPressEvent));
      this.actor.connect('notify::hover', Lang.bind(this, this._onHoverChanged));
      this.actor.connect('key-focus-in', Lang.bind(this, this._onKeyFocusIn));
      this.actor.connect('key-focus-out', Lang.bind(this, this._onKeyFocusOut));


      this.app = this._createAppWrapper(this.place);

      this.container = new St.BoxLayout({ vertical: false });

      this.icon = this.app.create_icon_texture(this.iconSize);
      if(this.icon) { 
         this.container.add(this.icon, { x_fill: false, y_fill: false, x_align: St.Align.START, y_align: St.Align.MIDDLE, expand: false });
         this.icon.realize();
      }

      this.label = new St.Label({ style_class: 'menu-application-button-label', text: place.name });
      this.container.add(this.label, { x_fill: true, y_fill: false, x_align: St.Align.START, y_align: St.Align.MIDDLE, expand: true });

      let ejectIcon = new St.Icon({ icon_name: 'media-eject', icon_type: St.IconType.SYMBOLIC, style_class: 'popup-menu-icon' });
      this.ejectButton = new St.Button({ style_class: 'menu-eject-button', child: ejectIcon });
      this.ejectButton.connect('clicked', Lang.bind(this, this._eject));
      this.ejectButton.connect('enter-event', Lang.bind(this, this._ejectEnterEvent));
      this.ejectButton.connect('leave-event', Lang.bind(this, this._ejectLeaveEvent));
      this.actor.add(this.container, { x_fill: false, y_fill: false, x_align: St.Align.START, y_align: St.Align.MIDDLE, expand: true });
      this.actor.add(this.ejectButton, { x_fill: false, y_fill: false, x_align: St.Align.END, y_align: St.Align.MIDDLE, expand: true });

      this.setIconVisible(iconVisible);
      this.label.realize();
      this.actor._delegate = this;
   },

   _ejectEnterEvent: function(actor, event) {
      global.set_cursor(Cinnamon.Cursor.POINTING_HAND);
      actor.add_style_pseudo_class('hover');
   },

   _ejectLeaveEvent: function(actor, event) {
      actor.remove_style_pseudo_class('hover');
      global.unset_cursor();
   },

   setIconSize: function(iconSize) {
      this.iconSize = iconSize;
      if(this.icon) {
         let visible = this.icon.visible;
         let iconParent = this.icon.get_parent();
         if(iconParent)
            iconParent.remove_actor(this.icon);
         this.icon.destroy();
         this.icon = this.place.iconFactory(this.iconSize);
         this.icon.visible = visible;
         this.container.insert_actor(this.icon, 0);
      }
   },

   setIconVisible: function(iconVisible) {
      if(this.icon)
         this.icon.visible = iconVisible;
   },

   _eject: function() {
      this.place.remove();
   },

   activate: function(event) {
      if(event)
         this.place.launch({ timestamp: event.get_time() });
      else
         this.place.launch();
      ConfigurableMenus.ConfigurablePopupBaseMenuItem.prototype.activate.call(this, event);
      this.parent.menu.close();
   },

   setActive: function(active) {
      if(active) {
         this.actor.set_style_class_name('menu-application-button-selected');
         this.actor.add_style_class_name('menu-removable-button-selected');
         this.selectedAppBox.setSelectedText(this.app.get_name(), this.app.get_description().split("\n")[0]);
         this.hover.refreshApp(this.app);
      }
      else {
         this.actor.set_style_class_name('menu-application-button');
         this.actor.add_style_class_name('menu-removable-button');
         this.selectedAppBox.setSelectedText("", "");
         this.hover.refreshFace();
      }
   },

   _createAppWrapper: function(place) {
      // We need this fake app to help standar works.
      this.app = {
         open_new_window: function(open) {
            place.launch();
         },
         get_description: function() {
            try {
               if(place.id.indexOf("bookmark:") == -1)
                  return decodeURIComponent(place.id.slice(13));
               return decodeURIComponent(place.id.slice(16));
            } catch(e) {
               Main.notify("Error on decode, the encode of the text are unsupported", e.message);
            }
            if(place.id.indexOf("bookmark:") == -1)
               return place.id.slice(13);
            return place.id.slice(16);
         },
         get_name: function() {
            return place.name;
         },
         create_icon_texture: function(appIconSize) {
            return place.iconFactory(appIconSize);
         }
      };
      return this.app;
   }
};

function ButtonChangerMenuItem(parent, icon, iconSize, labels, selected) {
   this._init(parent, icon, iconSize, labels, selected);
}

ButtonChangerMenuItem.prototype = {
   __proto__: ConfigurableMenus.ConfigurableBasicPopupMenuItem.prototype,

   _init: function (parent, icon, iconSize, labels, selected) {
      ConfigurableMenus.ConfigurableBasicPopupMenuItem.prototype._init.call(this, labels[selected]);
      this.theme = "";
      this.visible = true;
      this.actor.set_style_class_name('menu-category-button');
      this.actor.reactive = true;
      this.actor.track_hover = true;
      this.parent = parent;
      this.labels = labels;
      this.selected = selected;
      this.label.set_style_class_name('menu-selected-app-title');
      this.icon = new St.Icon({ style_class: 'popup-menu-icon', icon_type: St.IconType.FULLCOLOR, icon_name: icon, icon_size: iconSize });
      this.label.realize();
      if(this.icon) {
         this.actor.add(this.icon, {x_fill: false, y_fill: false, x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE });
         this.icon.realize();
      } 
      this.actor.connect('button-release-event', Lang.bind(this, this._onButtonReleaseEvent));
      this.actor.connect('enter-event', Lang.bind(this, function() {
         global.set_cursor(Cinnamon.Cursor.POINTING_HAND);
         this.setActive(true);
      }));
      this.actor.connect('leave-event', Lang.bind(this, function() {
         global.unset_cursor();
         this.setActive(false);
      }));
   },

   registerCallBack: function(callBackOnSelectedChange) {
      this.callBackOnSelectedChange = callBackOnSelectedChange;
   },

   setIconSize: function(iconSize) {
      if(this.icon)
         this.icon.set_icon_size(iconSize);
   },

   setTextVisible: function(visible) {
      this.label.visible = visible;
   },

   activate: function (event, keepMenu) {
      this.activateNext();
      this.emit('activate', event, true);
   },

   setTheme: function(theme) {
      this.theme = '-' + theme;
      this.actor.set_style_class_name('menu-category-button');
      this.actor.add_style_class_name('menu-swap-button-' + this.theme);
   },

   setActive: function(active) {
      if(this.active != active) {
         this.active = active;
         if(!this.parent.actorResize) {
            if(active) {
               this.actor.set_style_class_name('menu-category-button-selected');
               this.actor.add_style_class_name('menu-swap-button' + this.theme + '-selected');
            }
            else {
               this.actor.set_style_class_name('menu-category-button');
               this.actor.add_style_class_name('menu-swap-button' + this.theme);
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
      }
      //this.parent._disableResize();
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

function HoverIconBox(parent, iconSize) {
   this._init(parent, iconSize);
}

HoverIconBox.prototype = {
   __proto__: ConfigurableMenus.ConfigurablePopupSubMenuMenuItem.prototype,
    
   _init: function(parent, iconSize) {
      ConfigurableMenus.ConfigurablePopupSubMenuMenuItem.prototype._init.call(this, "", true, true, { hover: false, focusOnHover: false });
      try {
         this.actor._delegate = this;
         this.parent = parent;
         this.iconSize = iconSize;
         this.container = this.actor;
         this.actor = new St.BoxLayout({ vertical: false });
         this.actor.add_actor(this.container);

         this.container.set_height(this.iconSize);
         this._userIcon = new St.Icon({ icon_size: this.iconSize });

         this._icon.set_icon_size(this.iconSize);
         this._icon.set_icon_type(St.IconType.FULLCOLOR);
         this._icon.get_parent().remove_actor(this._icon);

         this.actor.add_actor(this.menu.actor);
         this.menu.actor.set_style_class_name('menu-context-menu');

         this._user = AccountsService.UserManager.get_default().get_user(GLib.get_user_name());
         this._userLoadedId = this._user.connect('notify::is_loaded', Lang.bind(this, this._onUserChanged));
         this._userChangedId = this._user.connect('changed', Lang.bind(this, this._onUserChanged));

         let menuItem;
         let userBox = new St.BoxLayout({ style_class: 'user-box', vertical: false });
         this.label.set_style_class_name('user-label');
         this.label.get_parent().remove_actor(this.label);

         userBox.add(this.label, { x_fill: false, y_fill: false, x_align: St.Align.START, y_align: St.Align.MIDDLE, expand: true });
         this.menu.addActor(userBox);

         this.notificationsSwitch = new ConfigurablePopupSwitchMenuItem(_("Notifications"), null, null, this._toggleNotifications, { focusOnHover: false });
         this.notificationsSwitch.actor.style = "padding-top: "+(2)+"px;padding-bottom: "+(2)+"px;padding-left: "+(1)+"px;padding-right: "+(1)+"px;margin:auto;";
         this.menu.addMenuItem(this.notificationsSwitch);
         global.settings.connect('changed::display-notifications', Lang.bind(this, function() {
            this.notificationsSwitch.setToggleState(global.settings.get_boolean("display-notifications"));
         }));
         this.notificationsSwitch.connect('toggled', Lang.bind(this, function() {
            global.settings.set_boolean("display-notifications", this.notificationsSwitch.state);
         }));

         /*this.account = new PopupMenu.PopupMenuItem(_("Account Details"), { focusOnHover: false });
         this.account.actor.style = "padding-top: "+(2)+"px;padding-bottom: "+(2)+"px;padding-left: "+(1)+"px;padding-right: "+(1)+"px;margin:auto;";
         this.menu.addMenuItem(this.account);
         this.account.connect('activate', Lang.bind(this, function() {
            Util.spawnCommandLine("cinnamon-settings user");
         }));*/

         this._onUserChanged();
         this.refreshFace();
         this.container.style = "padding-top: "+(0)+"px;padding-bottom: "+(0)+"px;padding-left: "+(0)+"px;padding-right: "+(0)+"px;margin:auto;";
         this.container.connect('button-press-event', Lang.bind(this, function() {
            this.actor.add_style_pseudo_class('pressed');
         }));
      } catch(e) {
         Main.notifyError("ErrorHover:",e.message);
      }
   },

   destroy: function() {
      ConfigurableMenus.ConfigurablePopupSubMenuMenuItem.prototype.destroy.call(this);
   },

   setSpecialColor: function(specialColor) {
      if(specialColor) {
         this.actor.set_style_class_name('menu-favorites-box');
         this.actor.add_style_class_name('menu-hover-icon-box');
      }
      else {
         this.actor.set_style_class_name('');
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
         this.menu.actor.navigate_focus(null, Gtk.DirectionType.DOWN, false);
         return true;
      } else if (symbol == Clutter.KEY_Left && this.menu.isOpen) {
         global.stage.set_key_focus(this.actor);
         this.toggleMenu();
         return true;
      }

      return ConfigurableMenus.ConfigurablePopupBaseMenuItem.prototype._onKeyPressEvent.call(this, actor, event);
    },

   _putFocus: function() {
      global.stage.set_key_focus(this.fav_actor);
   },

   setIconSize: function (iconSize) {
      this.iconSize = iconSize;
      if(this._userIcon)
         this._userIcon.set_icon_size(this.iconSize);
      if(this._icon)
         this._icon.set_icon_size(this.iconSize);
      if(this.lastApp)
         this.lastApp.set_icon_size(this.iconSize);
      this.container.set_height(this.iconSize);
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
          //this.parent._updateSize();
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
      //this.menu.close(true);
      this.setActive(false);
      this.container.remove_style_pseudo_class('open');
   },
    
   toggleMenu: function() {
      if(this.menu.isOpen) {
         this.menu.close(true);
         this.container.remove_style_pseudo_class('open');
         //this.menu.sourceActor._delegate.setActive(false);
      } else {
         this.menu.open();
         this.container.add_style_pseudo_class('open');
         //this.menu.sourceActor._delegate.setActive(true);
      }
   },

   _onUserChanged: function() {
      if(this._user.is_loaded) {
         this.label.set_text (this._user.get_real_name());
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
         if((icon)&&(this._icon)) {
            this._removeIcon();
            this._icon.set_icon_name(icon);
            this.container.add_actor(this._icon, 0);
         } else
            this.refreshFace();
      }
   },

   refreshApp: function (app) {
      if(this.actor.visible) {
         this._removeIcon();
         this.lastApp = app.create_icon_texture(this.iconSize);
         if(this.lastApp) {
            this.container.add_actor(this.lastApp, 0);
         }
      }
   },

   refreshPlace: function (place) {
      if(this.actor.visible) {
         this._removeIcon();
         this.lastApp = place.iconFactory(this.iconSize);
         if(this.lastApp) {
            this.container.add_actor(this.lastApp, 0);
         }
      }
   },

   refreshFile: function (file) {
      if(this.actor.visible) {
         this._removeIcon();
         this.lastApp = file.createIcon(this.iconSize);
         if(this.lastApp) {
            this.container.add_actor(this.lastApp, 0);
         }
      }
   },

   refreshFace: function () {
      if(this.actor.visible) {
         this._removeIcon();
         if(this._userIcon) {
            this.container.add_actor(this._userIcon, 0);
         }
      }
   },

   _removeIcon: function () {
      if(this.lastApp) {
         this.container.remove_actor(this.lastApp);
         this.lastApp.destroy();
         this.lastApp = null;
      }
      if((this._icon)&&(this._icon.get_parent() == this.container))
         this.container.remove_actor(this._icon);
      if((this._userIcon)&&(this._userIcon.get_parent() == this.container))
         this.container.remove_actor(this._userIcon);
   }
};

function ConfigurablePopupSwitchMenuItem() {
    this._init.apply(this, arguments);
}

ConfigurablePopupSwitchMenuItem.prototype = {
    __proto__: ConfigurableMenus.ConfigurablePopupBaseMenuItem.prototype,

    _init: function(text, imageOn, imageOff, active, params) {
        ConfigurableMenus.ConfigurablePopupBaseMenuItem.prototype._init.call(this, params);

        this._imageOn = imageOn;
        this._imageOff = imageOff;

        let table = new St.Table({ homogeneous: false, reactive: true });

        this.label = new St.Label({ text: text });
        this.label.set_margin_left(6.0);

        this._switch = new ConfigurableMenus.Switch(active);

        if(active)
           this.icon = new St.Icon({ icon_name: this._imageOn, icon_type: St.IconType.FULLCOLOR, style_class: 'popup-menu-icon' });
        else
           this.icon = new St.Icon({ icon_name: this._imageOff, icon_type: St.IconType.FULLCOLOR, style_class: 'popup-menu-icon' });

        this._statusBin = new St.Bin({ x_align: St.Align.END });
        this._statusBin.set_margin_left(6.0);
        this._statusLabel = new St.Label({ text: '', style_class: 'popup-inactive-menu-item' });
        this._statusBin.child = this._switch.actor;

        table.add(this.icon, {row: 0, col: 0, col_span: 1, x_expand: false, x_align: St.Align.START});
        table.add(this.label, {row: 0, col: 1, col_span: 1, y_fill: false, y_expand: true, x_align: St.Align.MIDDLE, y_align: St.Align.MIDDLE});
        table.add(this._statusBin, {row: 0, col: 2, col_span: 1, x_expand: true, x_align: St.Align.END});

        this.addActor(table, { expand: true, span: 1, align: St.Align.START});
    },

    setToggleState: function(state) {
        if(state)
           this.icon.set_icon_name(this._imageOn);
        else
           this.icon.set_icon_name(this._imageOff);
        this._switch.setToggleState(state);
    },

    get_state: function() {
        return this._switch.state;
    }
};

// This is only a clone for the dalcde update
// we used it here to support old cinnamon versions.
function PopupIconMenuItem() {
   this._init.apply(this, arguments);
}

PopupIconMenuItem.prototype = {
   __proto__: ConfigurableMenus.ConfigurablePopupBaseMenuItem.prototype,

   _init: function(text, iconName, iconType, params) {
      ConfigurableMenus.ConfigurablePopupBaseMenuItem.prototype._init.call(this, params);
      if(iconType != St.IconType.FULLCOLOR)
          iconType = St.IconType.SYMBOLIC;
      this.label = new St.Label({text: text});
      this._icon = new St.Icon({ style_class: 'popup-menu-icon',
         icon_name: iconName,
         icon_type: iconType});
      this.addActor(this._icon, {span: 0});
      this.addActor(this.label);
   },

   setIconSymbolicName: function(iconName) {
      this._icon.set_icon_name(iconName);
      this._icon.set_icon_type(St.IconType.SYMBOLIC);
   },

   setIconName: function(iconName) {
      this._icon.set_icon_name(iconName);
      this._icon.set_icon_type(St.IconType.FULLCOLOR);
   }
};
