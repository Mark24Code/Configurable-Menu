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

const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Lang = imports.lang;
const Main = imports.ui.main;
/*
const LIB_PATH = '/usr/share/cinnamon/applets/menu@cinnamon.org';
imports.searchPath.unshift(LIB_PATH);
const CinnamonMenu = imports.applet;
*/

const AppletPath = imports.ui.appletManager.applets['configurableMenu@lestcape'];
const MenuItems = AppletPath.menuItems;

//PakagesManager
function TerminalReader(command, callback) {
   this._init(command, callback);
}

TerminalReader.prototype = {
   _init: function(command, callback) {
      this._callbackPipe = callback;
      this._commandPipe = command;
      this.idle = true;
      this._childWatch = null;
   },

   executeReader: function() {
      if(this.idle) {
         this.idle = false;
         try {
            let [success, argv] = GLib.shell_parse_argv("sh -c '" + this._commandPipe + "'");
            if(success) {
               let [exit, pid, stdin, stdout, stderr] =
                  GLib.spawn_async_with_pipes(
                     null, // cwd
                     argv, // args
                     null, // env
                     GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD, //Use env path and no repet
                     null // child_setup
                  );

               this._childPid = pid;
               this._stdin = new Gio.UnixOutputStream({ fd: stdin, close_fd: true });
               this._stdout = new Gio.UnixInputStream({ fd: stdout, close_fd: true });
               this._stderr = new Gio.UnixInputStream({ fd: stderr, close_fd: true });
         
               // We need this one too, even if don't actually care of what the process
               // has to say on stderr, because otherwise the fd opened by g_spawn_async_with_pipes
               // is kept open indefinitely
               this._stderrStream = new Gio.DataInputStream({ base_stream: this._stderr });
               this._dataStdout = new Gio.DataInputStream({ base_stream: this._stdout });
               this._cancellableStderrStream = new Gio.Cancellable();
               this._cancellableStdout = new Gio.Cancellable();

               this.resOut = 1;
               this._readStdout();
               this.resErr = 1;
               this._readStderror();

               this._childWatch = GLib.child_watch_add(GLib.PRIORITY_DEFAULT, pid, Lang.bind(this, function(pid, status, requestObj) {
                  GLib.source_remove(this._childWatch);
                  this._childWatch = null;
                  this._stdin.close(null);
                  this.idle = true;
               }));
            }
            //throw
         } catch(err) {
            if (err.code == GLib.SpawnError.G_SPAWN_ERROR_NOENT) {
               err.message = _("Command not found.");
            } else {
               // The exception from gjs contains an error string like:
               //   Error invoking GLib.spawn_command_line_async: Failed to
               //   execute child process "foo" (No such file or directory)
               // We are only interested in the part in the parentheses. (And
               // we can't pattern match the text, since it gets localized.)
               err.message = err.message.replace(/.*\((.+)\)/, '$1');
            }
            throw err;
         }
      }
   },

   destroy: function() {
      try {
         if(this._childWatch) {
            GLib.source_remove(this._childWatch);
            this._childWatch = null;
         }
         if(!this._dataStdout.is_closed()) {
            this._cancellableStdout.cancel();
            this._stdout.close_async(0, null, Lang.bind(this, this.closeStdout));
         }
         if(!this._stderrStream.is_closed()) {
            this._cancellableStderrStream.cancel();
            this._stderrStream.close_async(0, null, Lang.bind(this, this.closeStderrStream));
         }
         this._stdin.close(null);
         this.idle = true;
      }
      catch(e) {
         Main.notify("Error on close" + this._dataStdout.is_closed(), e.message);
      }
   },

   closeStderrStream: function(std, result) {
      try {
        std.close_finish(result);
      } catch(e) {
         std.close_async(0, null, Lang.bind(this, this.closeStderrStream));
      }
   },

   closeStdout: function(std, result) {
      try {
        std.close_finish(result);
      } catch(e) {
         std.close_async(0, null, Lang.bind(this, this.closeStderrStream));
      }
   },

   _readStdout: function() {
      this._dataStdout.fill_async(-1, GLib.PRIORITY_DEFAULT, this._cancellableStdout, Lang.bind(this, function(stream, result) {
         try {
            if(!this._dataStdout.is_closed()) {
               if(this.resOut != -1)
                  this.resOut = this._dataStdout.fill_finish(result);// end of file
               if(this.resOut == 0) {
                  let val = stream.peek_buffer().toString();
                  if(val != "")
                     this._callbackPipe(this._commandPipe, true, val);
                  this._stdout.close(this._cancellableStdout);
               } else {
                  // Try to read more
                  this._dataStdout.set_buffer_size(2 * this._dataStdout.get_buffer_size());
                  this._readStdout();
               }
            }
         } catch(e) {
            global.log(e.toString());
         }
      }));
   },

   _readStderror: function() {
      this._stderrStream.fill_async(-1, GLib.PRIORITY_DEFAULT, this._cancellableStderrStream, Lang.bind(this, function(stream, result) {
         try {
            if(!this._stderrStream.is_closed()) {
               if(this.resErr != -1)
                  this.resErr = this._stderrStream.fill_finish(result);
               if(this.resErr == 0) { // end of file
                  let val = stream.peek_buffer().toString();
                  if(val != "")
                     this._callbackPipe(this._commandPipe, false, val);
                  this._stderr.close(null);
               } else {
                  this._stderrStream.set_buffer_size(2 * this._stderrStream.get_buffer_size());
                  this._readStderror();
               }
            }
         } catch(e) {
            global.log(e.toString());
         }
      }));
   }
};

function PackagekitWrapper(parent) {
   this._init(parent);
}

PackagekitWrapper.prototype = {
   _init: function(parent) {
      const Pk = imports.gi.PackageKitGlib;
      this._client = new Pk.Client();
      this.filter = Pk.PK_FILTER_ENUM_NOT_INSTALLED
      this._cancellable = null;
   },

   searchUninstallPackage: function(pattern, callBackFunc) {
      this.callBackFunc = callBackFunc;
      Mainloop.idle_add(Lang.bind(this, function() {
         try {
            this._cancellable = new Gio.Cancellable();
            //This generate a core dump.
            //this._client.search_names_async(this.filter, [pattern], this._cancellable, Lang.bind(this, this._updatesProgress), Lang.bind(this, this._finishSearch));
            let result = this._client.search_names(this.filter, [pattern], this._cancellable, Lang.bind(this, this._updatesPr));
            if(this._cancellable) {
               this._packages = result.get_package_array();
               let resPkg = new Array();
               for(let i = 0; i < this._packages.length; i++) {
                  if(resPkg.indexOf(this._packages[i].get_name()) == -1)
                     resPkg.push(this._packages[i].get_name());
               }
               if((this._packages.length > 0)&&(this.callBackFunc))
                  this.callBackFunc(resPkg);
            }
         } catch(e) {
            //Main.notify("errorkit", e.message);
         }
      }));
   },

   destroy: function() {
      try {
         if(this._cancellable) {
            this._cancellable.cancel();
            this._cancellable = null;
         }
      }
      catch(e) {
         Main.notify("Error on close" + this._dataStdout.is_closed(), e.message);
      }
   },

   _finishSearch: function(progress, a, b, c, d) {
      Main.notify("was");
   },

   _updatesPr: function(progress, a, b, c, d) {
      //Main.notify("was");
   },

   _updatesProgress: function(progress, a, b, c, d) {
      Main.notify("was" + progress);
   }
};

function PackageInstallerWrapper(parent) {
   this._init(parent);
}

PackageInstallerWrapper.prototype = {
   _init: function(parent) {
      this.parent = parent;
      this.actorSearchBox = null;
      this.lastedSearch = null;
      this.iconSize = 22;
      this.appWidth = 200;
      this.textWidth = 150;
      this.appDesc = false;
      this.vertical = false;
      this.cacheSize = 30;
      this.maxSearch = 10;
      this.cacheUpdate = false;
      this.pythonVer = "python3";
      this.kitInstaller = null;
      //this._tryToConectedPackageKit();
      this.pathCinnamonDefaultUninstall = "/usr/bin/cinnamon-remove-application";
      this._canCinnamonUninstallApps = false;
      this.pathToLocalUpdater = GLib.get_home_dir() + "/.local/share/cinnamon/applets/" + this.parent.uuid + "/pkg_updater/Updater.py";
      this.pathToRemoteUpdater = GLib.get_home_dir() + "/.local/share/Cinnamon-Installer/Cinnamon-Installer/Updater.py";
      this.pathToPKG = GLib.get_home_dir() + "/.local/share/Cinnamon-Installer/Cinnamon-Installer.py";
      this.pathToPkgIcon = GLib.get_home_dir() + "/.local/share/cinnamon/applets/" + this.parent.uuid + "/icons/install.svg"
      this.gIconInstaller = new Gio.FileIcon({ file: Gio.file_new_for_path(this.pathToPkgIcon) });
      this.listButtons = new Array();
      this.pakages = [];
   },

   destroy: function() {
      for(let i = 0; i < this.listButtons.length; i++) {
         this.listButtons[i].destroy();
      }
   },

   setMaxSearch: function(maxS) {
      this.maxSearch = maxS;
   },

   enableDefaultInstaller: function(enable) {
      if((enable)&&(GLib.find_program_in_path("gksu")))
         this._canCinnamonUninstallApps = GLib.file_test(this.pathCinnamonDefaultUninstall, GLib.FileTest.EXISTS);
      else
         this._canCinnamonUninstallApps = false; 
   },

   canCinnamonUninstallApps: function() {
      return this._canCinnamonUninstallApps;
   },

   _tryToConectedPackageKit: function() {
      try {
         this.kitInstaller = new PackagekitWrapper();
      } catch(e) {
         //Main.notify("error", e.message);
         this.kitInstaller = null;
      }
   },

   _getUpdaterPath: function() {
      let updaterPath = "";
      if(GLib.file_test(this.pathToLocalUpdater, GLib.FileTest.EXISTS))
         updaterPath = this.pathToLocalUpdater;
      else if(GLib.file_test(this.pathToRemoteUpdater, GLib.FileTest.EXISTS))
         updaterPath = this.pathToRemoteUpdater;
      if((updaterPath != "")&&(!GLib.file_test(updaterPath, GLib.FileTest.IS_EXECUTABLE))) {
         this._setChmod(updaterPath, '+x');
      }
      return updaterPath;
   },

   setSearchBox: function(actorSearchBox, actorSeparator) {
      this.actorSearchBox = actorSearchBox;
      this.actorSeparator = actorSeparator;
   },

   preloadCache: function() { //this preload a cache for buttons..
      if(!this.cacheUpdate) {
         let btt;
         for(let i = 0; i < this.cacheSize; i++) {
            btt = new MenuItems.PackageItem(this.parent.menu, this, "", this.gIconInstaller, this.iconSize, this.textWidth, this.appDesc, this.vertical, this.appWidth);
            btt.actor.realize();
            this.listButtons.push(btt);
            btt.actor.connect('leave-event', Lang.bind(this, this._appLeaveEvent, btt));
            this.parent._addEnterEvent(btt, Lang.bind(this, this._appEnterEvent, btt));
            this.listButtons[i].actor.visible = true;
         }
      }
      this.cacheUpdate = true;
   },

   exist: function() {
      return GLib.file_test(this.pathToPKG, GLib.FileTest.EXISTS);
   },

   checkForUpdate: function() {
      let updaterPath = this._getUpdaterPath();
      if(updaterPath != "") {
         let query = this.pythonVer + " " + updaterPath + " --qupdate silent";
         this._execCommandSyncPipe(query, Lang.bind(this, this._doUpdate));
      }
   },

   _doUpdate: function(command, sucess, result) {
      //"update" and "ready"
      if(result.indexOf("update") == 0) {
         this.executeUpdater("--qupdate gui");
      } else if(result.indexOf("internet") == 0) {
         Main.notify(_("Internet connection is required to check for update of Cinnamon Installer."));
      }
   },
//is file: GLib.FileTest.IS_REGULAR
//is dir: GLib.FileTest.IS_DIR
   executeUpdater: function(action) {
      let updaterPath = this._getUpdaterPath();
      if(updaterPath != "") {
         this._execCommand(this.pythonVer + " " + updaterPath + " " + action);
      }
   },

   executeSearch: function(pattern) {
      if(this.kitInstaller) {
         this.activeSearch = ((pattern)&&(pattern.length > 2));
         if(this.activeSearch) {
            this.kitInstaller.destroy();
            this.clearView();
            this.kitInstaller.searchUninstallPackage(pattern, Lang.bind(this, this._doSearchPackageKit));
         }
      } else {
         this.activeSearch = ((pattern)&&(pattern.length > 2));
         if(this.activeSearch) {
            if(!GLib.file_test(this.pathToPKG, GLib.FileTest.IS_EXECUTABLE)) {
               this._setChmod(this.pathToPKG, '+x');
            }
            let query = this.pythonVer + " " + this.pathToPKG + " --qpackage ";
            let patternList = pattern.toLowerCase().split(" ");
            let patternQuery = "";
            for(let patt in patternList)
               patternQuery += patternList[patt] + ",";
            this.activeSearch = (patternQuery.length > 3);
            if(this.activeSearch) {
               query += "\"" + patternQuery.substring(0, patternQuery.length-1) + "\"";
               if(this.lastedSearch)
                  this.lastedSearch.destroy();
               this.lastedSearch = this._execCommandSyncPipe(query, Lang.bind(this, this._doSearchPackage));
            } else
               this.pakages = [];
         } else
            this.pakages = [];
         if(this.parent.menu.isOpen)
            this.preloadCache();
      }
   },

   cleanSearch: function() {
      this.executeSearch("");
   },

   updateButtonStatus: function(iconSize, textWidth, appDesc, vertical, appWidth) {
      this.appWidth = appWidth;
      this.iconSize = iconSize;
      this.textWidth = textWidth;
      this.appDesc = appDesc;
      this.vertical = vertical;
   },

   installPackage: function(packageName) {
      let query = this.pythonVer + " " + this.pathToPKG + " --ipackage " + packageName;
      this._execCommand(query);
   },

   uninstallProgram: function(programId) {
      let length = programId.length;
      if(programId.substring(length-8, length) == ".desktop") {
         let programName = programId.substring(0, length-8);
         if(this._canCinnamonUninstallApps) {// This will be used to uninstall app, if cinnamon add a good tools...
            let fileName = GLib.find_program_in_path(programName);
            if(fileName) {
               this._execCommand("gksu -m '" + _("Please provide your password to uninstall this application") +
                                 "' " + this.pathCinnamonDefaultUninstall + " '" + fileName+ "'");
            }
         } else {
            let query = this.pythonVer + " " + this.pathToPKG + " --uprogram " + programName.toLowerCase();
            this._execCommand(query);
         }
      }
   },

   _doSearchPackage: function(command, sucess, result) {
      try {
         Mainloop.idle_add(Lang.bind(this, function() {
            this.pakages = [];
            if(this.activeSearch) 
               this.pakages = result.split("\n");
            if(this.pakages.length > 0)
               this.pakages.splice(this.pakages.length-1, 1);
            this.parent._updateView();
         }));
      } catch(e) {
         Main.notify(e);
      }
   },

   _doSearchPackageKit: function(pakagesList) {
      Mainloop.idle_add(Lang.bind(this, function() {
         this.pakages = pakagesList;
         this.parent._updateView();
      }));
   },

   _createButtons: function() {
      try {
         let btt;
         for(let i = this.listButtons.length; i < this.pakages.length; i++) {
            btt = new MenuItems.PackageItem(this.parent.menu, this, this.pakages[i], this.gIconInstaller, this.iconSize, this.textWidth, this.appDesc, this.vertical, this.appWidth);
            btt.actor.realize();
            this.listButtons.push(btt);
            btt.actor.connect('leave-event', Lang.bind(this, this._appLeaveEvent, btt));
            this.parent._addEnterEvent(btt, Lang.bind(this, this._appEnterEvent, btt));
         }
         for(let i = 0; i < this.pakages.length; i++) {
            this.listButtons[i].updateData(this.pakages[i], this.iconSize, this.textWidth, this.appDesc, this.vertical, this.appWidth);
         }
         this.actorSeparator.visible = (this.pakages.length > 0);
      } catch(e) {
         Main.notify("button creation fail", e.message);
      }
   },

   updateView: function() {
      if(this.pakages.length > 0) {
         try { 
            this._createButtons();
            let viewBox = this.actorSearchBox.get_children();
            let currValue, falseActor;
            let maxValue = Math.min(this.pakages.length, this.maxSearch);
            for(let i = 0; i < maxValue; i += viewBox.length) {
               currValue = i;
               for(let j = 0; j < viewBox.length; j++) {
                  if(currValue < maxValue) {
                     viewBox[j].add_actor(this.listButtons[currValue].actor);
                     this.listButtons[currValue].actor.visible = false;
                     falseActor = new St.BoxLayout();
                     falseActor.hide();
                     viewBox[j].add_actor(falseActor);
                  }
                  currValue++;
               }
            }
            this._makeVisible();
         } catch(e) {
            Main.notify("err", e.message);
         }
      } else
         this.actorSeparator.visible = false;
   },

   _makeVisible: function() {
      let maxValue = Math.min(this.pakages.length, this.maxSearch);
      for(let i = 0; i < maxValue; i++) {
         Mainloop.idle_add(Lang.bind(this, function(pos) {//to not blocked the keyboard event for a while....
            if(this.listButtons[pos])
               this.listButtons[pos].actor.visible = true;
         }, i));
      }
      for(let i = maxValue; i < this.listButtons.length; i++) {
         this.listButtons[i].actor.visible = false;
      }
   },

   clearView: function() {
      let appBox = this.actorSearchBox.get_children();
      let appItem;
      for(let i = 0; i < appBox.length; i++) {
         appItem = appBox[i].get_children();
         for(let j = 0; j < appItem.length; j++) {
            appBox[i].remove_actor(appItem[j]);
         }
         if(i > 0)
            appBox[i].set_width(-1);
      }
   },

   _appEnterEvent: function(applicationButton) {
      if(applicationButton.app.get_description())
         this.parent.selectedAppBox.setSelectedText(applicationButton.app.get_name(), applicationButton.app.get_description());
      else
         this.parent.selectedAppBox.setSelectedText(applicationButton.app.get_name(), "");
      this.parent._previousVisibleIndex = this.parent.appBoxIter.getVisibleIndex(applicationButton.actor);
      this.parent._clearPrevAppSelection(applicationButton.actor);
      applicationButton.actor.style_class = "menu-application-button-selected";
      this.parent.hover.refreshApp(applicationButton.app);
   },

   _appLeaveEvent: function(a, b, applicationButton) {
      this.parent._previousSelectedActor = applicationButton.actor;
      applicationButton.actor.style_class = "menu-application-button";
      this.parent.selectedAppBox.setSelectedText("", "");
      this.parent.hover.refreshFace();
   },

   _execCommandSyncPipe: function(command, callBackFunction) {
      try {
         return this._trySpawnAsyncPipe(command, callBackFunction);
      } catch (e) {
         let title = _("Execution of '%s' failed:").format(command);
         Main.notifyError(title, e.message);
      }
      return null;
   },

   _setChmod: function(path, permissions) {
      //permissions = +x
      let command = "chmod " + permissions + " \"" + path + "\"";
      this._execCommand(command);
   },

   _execCommand: function(command) {
      try {
         let [success, argv] = GLib.shell_parse_argv(command);
         this._trySpawnAsync(argv);
         return true;
      } catch (e) {
         let title = _("Execution of '%s' failed:").format(command);
         Main.notifyError(title, e.message);
      }
      return false;
   },

   _trySpawnAsync: function(argv) {
      try {   
         GLib.spawn_async(null, argv, null,
            GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.STDOUT_TO_DEV_NULL  | GLib.SpawnFlags.STDERR_TO_DEV_NULL,
            null, null);
      } catch (err) {
         if (err.code == GLib.SpawnError.G_SPAWN_ERROR_NOENT) {
            err.message = _("Command not found.");
         } else {
            // The exception from gjs contains an error string like:
            //   Error invoking GLib.spawn_command_line_async: Failed to
            //   execute child process "foo" (No such file or directory)
            // We are only interested in the part in the parentheses. (And
            // we can't pattern match the text, since it gets localized.)
            err.message = err.message.replace(/.*\((.+)\)/, '$1');
         }
         throw err;
      }
   },

   _trySpawnAsyncPipe: function(command, callback) {
      let terminal = new TerminalReader(command, callback);
      terminal.executeReader();
      return terminal;
   }
};
