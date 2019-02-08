(function (global) {
    'use strict'
    var test = 1;
    var color = function (r, g, b) {
        this.r = r;
        this.g = g;
        this.b = b;
    }

    var dot = function (x, y, board, isCopy) {
        this.x = x;
        this.y = y;
        //画板
        this.board = board;
        this.isCopy = isCopy;
        this.r = 5;
        this.a = 1;
        this.c = new color(255, 255, 255);
        //状态
        this.isWorking = false;
        //移动的轨迹
        this.moveList = [];
        //移动次数
        this.step = 0;
        //速度
        this.speed = 0.1;
        //上一个位置
        this.nextPoint = this.clone();
    }

    dot.prototype = {
        clone: function () {
            return {
                x: this.x,
                y: this.y,
                r: this.r,
                a: this.a,
                step: this.step
            }
        },
        _getDistance(p) {
            var x = p.x - this.x;
            var y = p.y - this.y;
            var a = p.a - this.a;
            var r = p.r - this.r;
            var d = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));

            return {
                x: x,
                y: y,
                a: a,
                r: r,
                d: d
            };
        },
        _movingToPoint(p) {
            var di = this._getDistance(p);
            var s = this.isWorking ? this.speed : this.speed / 3
            var res = false;

            if (Math.abs(di.a) > 0.05) {
                this.a += di.a * this.speed * 3;
                res = true;
            }

            if (Math.abs(di.r) > 0.1) {
                this.r += di.r * this.speed * 3;
                res = true;
            }

            if (di && di.d > 1) {
                this.x += di.x * s;
                this.y += di.y * s;
                res = true;
            } else {
                this.x = p.x;
                this.y = p.y;
            }
            return res;
        },
        move: function (p) {
            this.moveList.push(p);
        },
        buildColor: function () {
            return 'rgba(' + this.c.r + ',' + this.c.g + ',' + this.c.b + ',' + this.a + ')';
        },
        draw: function () {
            var ctx = this.board.context;
            ctx.save();
            ctx.beginPath();
            ctx.fillStyle = this.buildColor();
            ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2, false);
            ctx.fill();
            ctx.closePath();
            ctx.restore();
        },
        running: function () {
            if (!this._movingToPoint(this.nextPoint)) {
                var p = this.moveList.shift()
                if (p) {
                    this.nextPoint = p;
                } else {
                    if (this.isWorking) {
                        this.x += Math.sin(Math.random() * Math.PI);
                        this.y += Math.sin(Math.random() * Math.PI);
                    } else {
                        this.nextPoint.x += Math.random() * 50 - 25;
                        this.nextPoint.y += Math.random() * 50 - 25;
                    }
                }
            }
        },
        render: function () {
            this.running();
            this.draw();
        }
    }

    var shap = global.Shap = function (canvas, input) {
        this.canvas = canvas;
        this.input = input;
        this.w = 0;
        this.h = 0;

        this.interval = null;
        this.intervalTime = 1000;
        this.gup = 14;
        this.points = [];
        this.dots = [];
        this.ctlSymbol = '#'
        this.ctlListSymbol = '|'
        this.actReg = new RegExp(this.ctlSymbol + '\\S+');
    }

    shap.requestFrame = window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (callback) {
            window.setTimeout(callback, 1000 / 60);
        };

    shap.dot = dot;

    shap.prototype = {
        _disposeCmd: function (cmd) {
            var self = this;
            var cmdList = cmd.split(self.ctlListSymbol);
            console.log('list', cmdList)
            clearInterval(this.interval);
            this.interval = setInterval(function () {
                var cmd = cmdList.shift();
                var act = self.actReg.exec(cmd);
                var val = cmd;

                if (cmd) {
                    if (act) {
                        act = act[0].substring(1);
                        val = cmd.substring(act.length + 1).trim();
                    }
                    self._actToDots(act, val);
                }

            }, self.intervalTime);

        },
        _preDraw: function (act, val) {
            var v = val.split(' ')
            var cx = this.w / 2;
            var cy = this.h / 2;

            this.copyContext.save();
            this.copyContext.beginPath();
            this.copyContext.clearRect(0, 0, this.w, this.h);
            switch (act) {
                case 'rect':
                    this.copyContext.rect(cx - v[0] * this.gup / 2, cy - v[1] * this.gup / 2, v[0] * this.gup, v[1] * this.gup);
                    break;
                case 'circle':
                    this.copyContext.arc(cx, cy, v[0] * this.gup, 0, Math.PI * 2, false)
                    break;
                case 'count':
                    
                    break;
                default:
                    this.copyContext.font = '360px Avenir, Helvetica Neue, Helvetica, Arial, sans-serif';
                    console.log('text:', val)
                    this.copyContext.textAlign = 'center';
                    this.copyContext.fillText(val, cx, cy);
                    return
            }

            this.copyContext.fill();
            this.copyContext.restore();
        },
        _preDrawToPoints: function () {
            var g = this.gup;
            var w = this.w;
            var h = this.h;
            var d = this.copyContext.getImageData(0, 0, w, h).data;
            var i = 0;
            var x = 0;
            var y = 0;
            this.points = [];

            //计算需要绘画的点
            while (i < d.length) {
                if (d[i + 3] > 0) {
                    this.points.push({
                        x: x,
                        y: y
                    })
                }

                i += 4 * g;
                x += g;

                if (x > w) {
                    x = 0;
                    y += g;
                    i = y * w * 4
                }
            }
        },
        _computedDots: function () {
            var self = this;
            var d = this.dots;
            var p = this.points;
            var point;
            var diff = p.length - d.length;
            var i = 0;
            var j = 0;

            //初始化所有点的状态
            //模糊化当前点
            d.forEach(function (item) {
                if (item.isWorking) {
                    item.isWorking = false;
                    item.move({
                        x: item.x,
                        y: item.y,
                        a: Math.random() * 0.8 + 0.1,
                        r: Math.random() * 30 + 4
                    })
                }
            })

            if (diff > 0) {
                for (var i = 0; i < diff; i++) {
                    d.push(new shap.dot(this.w / 2, this.h / 2, this, true))
                }
            }

            while (p.length > 0) {
                i = Math.floor(Math.random() * p.length);
                point = p.splice(i, 1)[0];
                d[j].isWorking = true;
                d[j++].move({
                    x: point.x,
                    y: point.y,
                    r: 5,
                    a: 1,
                });
            }

            d.forEach(function (item) {
                if (!item.isWorking) {
                    item.move({
                        x: self.w * Math.random(),
                        y: self.h * Math.random(),
                        r: 5,
                        a: 0.3
                    })
                }
            })

        },
        _actToDots: function (act, val) {
            this._preDraw(act, val);
            this._preDrawToPoints();
            this._computedDots();
        },
        _eventBind: function () {
            var self = this;
            this.input.onkeydown = function (e) {
                if (e.keyCode == 13) {
                    self._disposeCmd(self.input.value);
                }
            }
        },
        init: function (canvas, input) {
            var c = canvas || this.canvas;
            var i = input || this.input;

            if (typeof c === 'string') {
                this.canvas = document.getElementById(c);
            }

            if (typeof i === 'string') {
                this.input = document.getElementById(i);
            }

            if (!this.canvas.tagName || !this.input.tagName) {
                console.log('canvas or input Ele can\'t found');
                return;
            }

            this.context = this.canvas.getContext('2d');
            this.copyCanvas = document.createElement('canvas');
            this.copyContext = this.copyCanvas.getContext('2d');

            this.canvas.width = document.body.clientWidth
            this.canvas.height = document.body.clientHeight
            this.w = this.canvas.width;
            this.h = this.canvas.height;
            this.copyCanvas.width = this.w;
            this.copyCanvas.height = this.h;
            document.body.appendChild(this.copyCanvas);

            this._eventBind();
        },
        render: function () {
            this.context.clearRect(0, 0, this.w, this.h)
            for (var i = 0; i < this.dots.length; i++) {
                var d = this.dots[i];
                d.render();
            }
        },
        run: function () {
            var self = this;
            requestAnimationFrame(function () {
                self.render();
                self.run();
            })
        }
    }
}(window))