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
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Main = imports.ui.main;

//configurableScrolls
function ScrollItemsBox(parent, panelToScroll, vertical, align) {
   this._init(parent, panelToScroll, vertical, align);
}

ScrollItemsBox.prototype = {
   _init: function(parent, panelToScroll, vertical, align) {
      this.parent = parent;
      this.idSignalAlloc = 0;
      this._timeOutScroll = 0;
      this._idReparent = 0;
      this._align = align;
      this.panelToScroll = panelToScroll;
      this.actor = new St.BoxLayout({ vertical: vertical });
      this._panelWrapper = new St.BoxLayout({ vertical: vertical });
      if(this.panelToScroll) {
         this._panelWrapper.add(this.panelToScroll, { x_fill: true, y_fill: true, x_align: align, y_align: St.Align.START, expand: true });
         this._idReparent = this.panelToScroll.connect('parent-set', Lang.bind(this, this._onParentChange));
      }
      this.scroll = this._createScroll(vertical);
      this.scroll.add_actor(this._panelWrapper);
      this.actor.add(this.scroll, { x_fill: true, y_fill: true, expand: true });
      this.actor._delegate = this;
   },

   destroy: function() {
      this.actor.destroy();
   },

   isBoxInViewPort: function(ax, ay, aw, ah) {
      let [sx, sy] = this.actor.get_transformed_position();
      let [sw, sh] = this.actor.get_transformed_size();
      return ((ax >= sx)&&(ax <= sx + sw)&&(ay >= sy)&&(ay <= sy + sh));
   },

   isActorInViewPort: function(actor) {
      if(actor) {
         let [ax, ay] = actor.get_transformed_position();
         let [aw, ah] = actor.get_transformed_size();
         let [sx, sy] = this.actor.get_transformed_position();
         let [sw, sh] = this.actor.get_transformed_size();
         return ((ax >= sx)&&(ax <= sx + sw)&&(ay >= sy)&&(ay <= sy + sh));
      }
      return false;
   },

   setPanelToScroll: function(panelToScroll) {
      if(this.panelToScroll != panelToScroll) {
         if(this.panelToScroll) {
            if(this.panelToScroll.get_parent() == this._panelWrapper) 
               this._panelWrapper.remove_actor(this.panelToScroll);
            if(this._idReparent != 0) {
               this.panelToScroll.disconnect(this._idReparent);
               this._idReparent = 0;
            }
         }
         this.panelToScroll = panelToScroll;
         this._panelWrapper.add(this.panelToScroll, { x_fill: true, y_fill: true, x_align: this._align, y_align: St.Align.START, expand: true });
         this._idReparent = this.panelToScroll.connect('parent-set', Lang.bind(this, this._onParentChange));
      }
   },

   setXAlign: function(align) {
      if(this._align != align) {
         this._align = align;
         if(this.panelToScroll) {
            let parent = this.panelToScroll.get_parent();
            if(parent) 
               parent.remove_actor(parent);
            if(this._idReparent != 0) {
               this.panelToScroll.disconnect(this._idReparent);
               this._idReparent = 0;
            }
         }
         this._panelWrapper.add(this.panelToScroll, { x_fill: true, y_fill: true, x_align: this._align, y_align: St.Align.START, expand: true });
         this._idReparent = this.panelToScroll.connect('parent-set', Lang.bind(this, this._onParentChange));
      }
   },

   setVertical: function(vertical) {
      if(vertical != this.actor.get_vertical()) {
         this.actor.set_vertical(vertical);
         if(this._panelWrapper && (this._panelWrapper.get_parent() == this.scroll))
            this.scroll.remove_actor(this._panelWrapper);
         this._panelWrapper.set_vertical(vertical);
         this.scroll.destroy();
         this.scroll = this._createScroll(vertical);
         this.scroll.add_actor(this._panelWrapper);
         this.actor.add(this.scroll, { x_fill: true, y_fill: true, expand: true });
      }
   },

   _createScroll: function(vertical) {
      let scrollBox;
      if(vertical) {
         scrollBox = new St.ScrollView({ x_fill: true, y_fill: false, y_align: St.Align.START, style_class: 'vfade menu-applications-scrollbox' });
         scrollBox.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
         let vscroll = scrollBox.get_vscroll_bar();
         vscroll.connect('scroll-start',
                          Lang.bind(this, function() {
                          this.parent.menu.passEvents = true;
                       }));
         vscroll.connect('scroll-stop',
                          Lang.bind(this, function() {
                          this.parent.menu.passEvents = false;
                       }));
      } else {
         scrollBox = new St.ScrollView({ x_fill: false, y_fill: true, x_align: St.Align.START, style_class: 'hfade menu-applications-scrollbox' });
         scrollBox.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.NEVER);
         let hscroll = scrollBox.get_hscroll_bar();
         hscroll.connect('scroll-start',
                          Lang.bind(this, function() {
                          this.parent.menu.passEvents = true;
                       }));
         hscroll.connect('scroll-stop',
                          Lang.bind(this, function() {
                          this.parent.menu.passEvents = false;
                       }));
      }
      scrollBox._delegate = this;
      return scrollBox;
   },

   _onAllocationChanged: function(actor, event) {
      if(this.visible && this.panelToScroll) {
         let w = this.panelToScroll.get_allocation_box().x2-this.panelToScroll.get_allocation_box().x1
         if((!this.actor.get_vertical())&&(this.actor.get_width() > w - 10)) {
            this.scroll.get_hscroll_bar().visible = false;
         } else {
            this.scroll.get_hscroll_bar().visible = true;
         }
      }   
   },

  _onParentChange: function() {
      if(this._idReparent > 0) {
         this.panelToScroll.disconnect(this._idReparent);
         this._idReparent = 0;
      }
      this.panelToScroll = null;
   },

//horizontalcode
   _setHorizontalAutoScroll: function(hScroll, setValue) {
      if(hScroll) {
         let childrens = hScroll.get_children();
         if((childrens)&&(childrens[0])&&(!childrens[0].get_vertical())) {
            if(!this.hScrollSignals)
               this.hScrollSignals = new Array();
            let hScrollSignal = this.hScrollSignals[hScroll];
            if(((!hScrollSignal)||(hScrollSignal == 0))&&(setValue)) {
               this.hScrollSignals[hScroll] = hScroll.connect('motion-event', Lang.bind(this, this._onMotionEvent));
            }
            else if((hScrollSignal)&&(hScrollSignal > 0)&&(!setValue)) {
               this.hScrollSignals[hScroll] = null;
               hScroll.disconnect(hScrollSignal);
            }
         }
      }
   },

   _onMotionEvent: function(actor, event) {
      this.hScroll = actor;
      let dMin = 10;
      let dMax = 50;
      let [mx, my] = event.get_coords();
      let [ax, ay] = this.hScroll.get_transformed_position();
      let [ah, aw] = [this.hScroll.get_height(), this.hScroll.get_width()];
      if((my < ay + ah)&&(my > ay)&&((mx < ax + dMin)&&(mx > ax - dMax))||
         ((mx > ax + aw - dMin)&&(mx < ax + aw + dMax)))
         this._doHorizontalScroll();
   },

   _doHorizontalScroll: function() {
      if(this._timeOutScroll > 0)
         Mainloop.source_remove(this._timeOutScroll);
      this._timeOutScroll = 0;
      if((this.hScrollSignals)&&(this.hScrollSignals[this.hScroll] > 0)) {
         let dMin = 10;
         let dMax = 50;
         let speed = 1;
         let [mx, my, mask] = global.get_pointer();
         let [ax, ay] = this.hScroll.get_transformed_position();
         let [ah, aw] = [this.hScroll.get_height(), this.hScroll.get_width()];
         if((my < ay + ah)&&(my > ay)) {
            if((mx < ax + dMin)&&(mx > ax - dMax)) {
               if(ax > mx)
                  speed = 20*speed*(ax - mx)/dMax;
               let val = this.hScroll.get_hscroll_bar().get_adjustment().get_value();
               this.hScroll.get_hscroll_bar().get_adjustment().set_value(val - speed);
               this._timeOutScroll = Mainloop.timeout_add(100, Lang.bind(this, this._doHorizontalScroll));
            }
            else if((mx > ax + aw - dMin)&&(mx < ax + aw + dMax)) {
               if(ax + aw < mx)
                  speed = 20*speed*(mx - ax - aw)/dMax;
               let val = this.hScroll.get_hscroll_bar().get_adjustment().get_value();
               this.hScroll.get_hscroll_bar().get_adjustment().set_value(val + speed);
               this._timeOutScroll = Mainloop.timeout_add(100, Lang.bind(this, this._doHorizontalScroll));
            }
         }
      }
   }, 
//horizontalcode
   set_style_class: function(styleClass) {
      this.scroll.style_class = styleClass;
   },

   setAutoScrolling: function(autoScroll) {
      if(this.actor.get_vertical())
         this.scroll.set_auto_scrolling(autoScroll);
      else
         this._setHorizontalAutoScroll(this.scroll, autoScroll);
   },

   setScrollVisible: function(visible) {
      this.visible = visible;
      if(this.actor.get_vertical())
         this.scroll.get_vscroll_bar().visible = visible;
      else {
         if((visible)&&(this.idSignalAlloc == 0))
            this.idSignalAlloc = this.actor.connect('allocation_changed', Lang.bind(this, this._onAllocationChanged));
         else if(this.idSignalAlloc > 0) {
            this.actor.disconnect(this.idSignalAlloc);
            this.idSignalAlloc = 0;
         }
         this.scroll.get_hscroll_bar().visible = visible;
      }
   },

   scrollToActor: function(actor) {
      try {
         if(actor) {
            if(this.actor.get_vertical()) {
               let current_scroll_value = this.scroll.get_vscroll_bar().get_adjustment().get_value();
               let box_height = this.actor.get_allocation_box().y2-this.actor.get_allocation_box().y1;
               let new_scroll_value = current_scroll_value;
               let hActor = this._getAllocationActor(actor, 0);
               if (current_scroll_value > hActor-10) new_scroll_value = hActor-10;
               if (box_height+current_scroll_value < hActor + actor.get_height()+10) new_scroll_value = hActor + actor.get_height()-box_height+10;
               if (new_scroll_value!=current_scroll_value) this.scroll.get_vscroll_bar().get_adjustment().set_value(new_scroll_value);
               // Main.notify("finish" + new_scroll_value);
            } else {
               let current_scroll_value = this.scroll.get_hscroll_bar().get_adjustment().get_value();
               let box_width = this.actor.get_allocation_box().x2-this.actor.get_allocation_box().x1;
               let new_scroll_value = current_scroll_value;
               if (current_scroll_value > actor.get_allocation_box().x1-10) new_scroll_value = actor.get_allocation_box().x1-10;
               if (box_width+current_scroll_value < actor.get_allocation_box().x2+40) new_scroll_value = actor.get_allocation_box().x2-box_width+40;
               if (new_scroll_value!=current_scroll_value) this.scroll.get_hscroll_bar().get_adjustment().set_value(new_scroll_value);
            }
         }
      } catch(e) {
        Main.notify("ScrollError", e.message);
      }
   },

   _getAllocationActor: function(actor, currHeight) {
      let actorParent = actor.get_parent();
      if((actorParent != null)&&(actorParent != this.parent)) {
         if(actorParent != this.panelToScroll) {
            return this._getAllocationActor(actorParent, currHeight + actor.get_allocation_box().y1);
         } else {
            return currHeight + actor.get_allocation_box().y1;
         }
      }
      return 0;//Some error
   }
};
