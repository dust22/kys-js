(function (PIXI, g, c, window) {
    'use strict';
    c.Scene = function() {

    };
    c.Scene.prototype.scene_init = function() {
        Object.assign(this, g.config);
        Object.assign(this, {
            x : 0,
            y : 0,
            requestid : 0,
            current_frame : 0,
            g_Time : 0,
            g_Tick : 0,
            pressed : null,
            pre_pressed : null,
            width_region: 0,
            sum_region: 0,
            towards : 0,
            towards_rightup : 0,
            towards_rightdown : 1,
            towards_leftup : 2,
            towards_leftdown : 3,
            towards_none : 4,
            step : 0,
            total_step : 0,
            min_step : 0,
            way_que : [],

        });
    };

    c.Scene.prototype.constructor = c.Scene;

    c.Scene.prototype.calDistance = function(x1, y1, x2, y2) {
        return Math.abs(x1 - x2) + Math.abs(y1 - y2);

    };
    c.Scene.prototype.getPositionOnWindow = function(x, y, view_x, view_y) {
        var p = this.getPositionOnRender(x, y, view_x, view_y);
        p.x = p.x * this.j.win_width  / this.j.centerx / 2;
        p.y = p.y * this.j.win_height / this.j.centery / 2;
        return p;
    };
    c.Scene.prototype.checkKeyPress = function(i) {
        if (i == g.keyconfig.UP ||
            i == g.keyconfig.DOWN ||
            i == g.keyconfig.LEFT ||
            i == g.keyconfig.RIGHT) {
            return true;
        }
        return false;
    };

    c.Scene.prototype.getTowardsPosition = function(tw, oldx, oldy, newpos) {
        newpos.x = oldx;
        newpos.y = oldy;
        if (tw == this.towards_none) {
            return;
        }

        switch (tw) {
            case this.towards_leftup:
                newpos.x--;
                break;
            case this.towards_rightdown:
                newpos.x++;
                break;
            case this.towards_rightup:
                newpos.y--;
                break;
            case this.towards_leftdown:
                newpos.y++;
                break;
        }
    };


    c.Scene.prototype.getTowardsByKey2 = function (key) {
        var tw = this.towards_none;
        switch (key) {
            case g.keyconfig.UP:
                tw = this.towards_rightup;
                break;
            case g.keyconfig.DOWN:
                tw = this.towards_leftdown;
                break;
            case g.keyconfig.LEFT:
                tw = this.towards_leftup;
                break;
            case g.keyconfig.RIGHT:
                tw = this.towards_rightdown;
                break;
        }
        return tw;
    };

    c.Scene.prototype.changeTowardsByKey = function(key) {
        var tw = this.getTowardsByKey2(key);
        if (tw != this.towards_none) {
            this.towards = tw;
        }
    };

    c.Scene.prototype.getMousePosition = function(view_x, view_y) {
        var mousepos = g.app.renderer.plugins.interaction.mouse.global;
        var mouse_x1 = mousepos.x * this.j.centerx * 2 / this.j.win_width;
        var mouse_y1 = mousepos.y * this.j.centery * 2 / this.j.win_height;
        mouse_y1 += this.tileh * 2;

        var p = {x : null, y : null};
        p.x = parseInt(((mouse_x1 - this.j.centerx) / this.tilew + (mouse_y1 - this.j.centery) / this.tileh) / 2 + view_x);
        p.y = parseInt(((-mouse_x1 + this.j.centerx) / this.tilew + (mouse_y1 - this.j.centery) / this.tileh) / 2 + view_y);
        return p;
    };
    c.Scene.prototype.getTowardsByMouse = function() {
        var mousepos = g.app.renderer.plugins.interaction.mouse.global;
        var mouse_x = mousepos.x * this.j.centerx * 2 / this.j.win_width;
        var mouse_y = mousepos.y * this.j.centery * 2 / this.j.win_height;
        if (mouse_x < this.j.centerx && mouse_y < this.j.centery) {
            return this.towards_leftup;
        }
        if (mouse_x < this.j.centerx && mouse_y > this.j.centery) {
            return this.towards_leftdown;
        }
        if (mouse_x > this.j.centerx && mouse_y < this.j.centery) {
            return this.towards_rightup;
        }
        if (mouse_x > this.j.centerx && mouse_y > this.j.centery) {
            return this.towards_rightdown;
        }
        return this.towards_none;
    };
    c.Scene.prototype.getTowardsPosition2 = function(x0, y0, tw, p) {
        if (tw == this.towards_none) {
            return;
        }
        p.x = x0;
        p.y = y0;
        switch (tw) {
            case this.towards_leftup:
                p.x--;
                break;
            case this.towards_rightdown:
                p.x++;
                break;
            case this.towards_rightup:
                p.y--;
                break;
            case this.towards_leftdown:
                p.y++;
                break;
        }
    };
    c.Scene.prototype.getTowardsByKey = function(e) {
        var tw = this.towards_none;
        if (this.checkKeyPress(e.keyCode)) {
            this.pressed = e.keyCode;

            if (this.pressed) {
                switch (this.pressed) {
                    case g.keyconfig.left:
                        tw = this.towards_leftup;
                        break;
                    case g.keyconfig.right:
                        tw = this.towards_rightdown;
                        break;
                    case g.keyconfig.up:
                        tw = this.towards_rightup;
                        break;
                    case g.keyconfig.down:
                        tw = this.towards_leftdown;
                        break;
                }
            }
        }
        return tw;
    };
    c.Scene.prototype.calTowards = function(x1, y1, x2, y2) {
        var d1, d2, dm;
        d1 = y2 - y1;
        d2 = x2 - x1;
        dm = Math.abs(d1) - Math.abs(d2);
        if ((d1 != 0) || (d2 != 0)) {
            if (dm >= 0) {
                if (d1 < 0) {
                    return this.towards_rightup;
                }
                else {
                    return this.towards_leftdown;
                }
            }
            else {
                if (d2 < 0) {
                    return this.towards_leftup;
                }
                else {
                    return this.towards_rightdown;
                }
            }
        }
        return this.towards_none;
    };

    c.Scene.prototype.findWay = function(Mx, My, Fx, Fy) {
        // standard BFS
        let dirs = [{x: 1, y: 0}, {x: 0, y: -1}, {x: 0, y: 1}, {x: -1, y: 0}];
        let root = {x: Mx, y: My};
        let visited = new Set(JSON.stringify(root));
        root.parent = null;
        let que = [root];
        let steps = 0;
        const maxSteps = 10000;
        while (que.length > 0) {
            if (steps >= maxSteps) {
                break;
            }
            let node = que.shift();
            // fount it
            if (node.x === Fx && node.y === Fy) {
                let parent = node;
                let results = [];
                // get all parents, in reverse
                while (parent) {
                    results.push({x: parent.x, y: parent.y});
                    parent = parent.parent;
                }
                this.way_que = results;
                break;
            }
            dirs.forEach(dir => {
                let newPoint = {x: node.x + dir.x, y: node.y + dir.y};
                let hashablePoint = JSON.stringify(newPoint);
                if (!this.canWalk(newPoint.x, newPoint.y) || visited.has(hashablePoint)) {
                    return;
                }
                visited.add(hashablePoint);
                newPoint.parent = node;
                que.push(newPoint);
            });
            steps += 1;
        }
        // not found, do nothing
    };

    c.Scene.prototype.getPositionOnRender = function(x, y, view_x, view_y) {
        var p = {};
        x = x - view_x;
        y = y - view_y;
        p.x = -y * 18 + x * 18 + this.j.centerx;
        p.y = y * 9 + x * 9 + this.j.centery;
        return p;
    };

    c.Scene.prototype.calCursorPosition = function(x, y, mousepos) {
        if (!mousepos) {
            var mousepos = g.app.renderer.plugins.interaction.mouse.global;
        }
        if (mousepos.x < 0 || mousepos.y < 0) {
            return false;
        }

        var win_width = g.app.view.width;
        var win_height = g.app.view.height;

        var mouse_x1 = mousepos.x * this.j.centerx * 2 / win_width;
        var mouse_y1 = mousepos.y * this.j.centery * 2 / win_height;

        mouse_y1 += this.tileh * 2;
        var p = {};

        p.x = parseInt(((mouse_x1 - this.j.centerx) / this.tilew + (mouse_y1 - this.j.centery) / this.tileh) / 2 + x);
        p.y = parseInt(((-mouse_x1 + this.j.centerx) / this.tilew + (mouse_y1 - this.j.centery) / this.tileh) / 2 + y);
        return p;
    };
    c.Scene.prototype.isOutLine = function(x, y) {
        return (this.x || this.x >= this.coord_count || y < 0 || y >= this.coord_count);
    };
})(PIXI, g, c, window);
