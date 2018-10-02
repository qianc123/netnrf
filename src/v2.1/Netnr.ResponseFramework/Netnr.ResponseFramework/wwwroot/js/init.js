﻿var rf = {
    key: {
        navmin: "c_navmin",/*导航最小化*/
        navtype: "c_navtype",/*导航浮动*/
        navskin: "c_navskin",/*导航皮肤*/
        fontsize: "c_fontsize",/*字体大小*/
        fontfamily: "c_fontfamily",/*字体*/
        btntype: "c_btntype"/*按钮皮肤*/
    },
    //localStorage
    ls: function (k, v) {
        if (arguments.length == 2) {
            localStorage[k] = v;
        } else {
            return localStorage[k] || null;
        }
    },
    //设置皮肤、样式
    setSkinStyle: function () {
        try {
            //加载保存的皮肤
            var sn = rf.ls(rf.key.navskin), fs = rf.ls(rf.key.fontsize), ff = rf.ls(rf.key.fontfamily);
            if (sn && sn.length > 4) {
                document.body.className = sn;
                var ssa = $('#switch_skin').find('a');
                ssa.removeClass('selected');
                ssa.filter('[data-skin="' + sn + '"]').addClass('selected');
            }
            //加载保存的样式
            fs && (document.body.style["font-size"] = fs);
            ff && (document.body.style["font-family"] = ff);
        } catch (e) { }
    },
    //设置导航浮动
    setNavType: function () {
        try {
            //加载保存的菜单设置
            var mt = rf.ls(rf.key.navtype), mm = rf.ls(rf.key.navmin);
            if (mt) {
                if (mt[1] == "1") {
                    $('#ace-settings-compact')[0].click()
                } else {
                    mt[0] == "1" && $('#ace-settings-hover')[0].click()
                }
            }
            mm == "1" && $('#sidebar-collapse')[0].click();
        }
        catch (e) { }
    },
    //Mobile
    isPC: function () { return !navigator.userAgent.match(/(iPhone|iPod|Android|ios)/i) },
    //DOM集合某一项是否包含节点
    contains: function (arr, target) {
        var item = null;
        $(arr).each(function () {
            if (this.contains(target)) {
                item = this;
                return false;
            }
        })
        return item;
    },
    //选项卡定位
    PositionTab: function () {
        var mm = $('#mtab-main'), vw = mm.parent().width(), sw = mm[0].scrollWidth;
        if (sw > vw) {
            var max = 0, min = -1 * (sw - vw), ml = 3, left = parseFloat(mm.css('left')), ca;
            mm.children().each(function () {
                ml += $(this).outerWidth() + 3;
                if (this.className.indexOf("active") >= 0) {
                    ca = this;
                    return false;
                }
            });
            if (ml + left > vw) {
                ml = -1 * ml + (vw / 2);
                ml = Math.max(min, ml);
                mm.css('left', ml);
            } else if (ml - $(ca).outerWidth() + left < 0) {
                ml = -1 * ml + (vw / 2);
                ml = Math.min(0, ml);
                mm.css('left', ml);
            }
        }
    },
    //打开选项卡 链接、含图标的标题，false不显示关闭按钮(可选)
    OpenPage: function (url, title, close) {
        var isopen = false, mmc = $('#mtab-main').children(), mb = $('#mtabox');
        mmc.removeClass('active');
        mb.children().removeClass('active');
        mb.find('iframe').each(function () {
            var shorturl = (this.src.split(location.host)[1] || "").toLowerCase();
            shorturl = shorturl.split('?')[0];
            if (shorturl != "" && url.toLowerCase().indexOf(shorturl) > -1) {
                //取消注释，点击导航会刷新页面
                //this.src = url;
                var pageid = $(this).parent().addClass('active')[0].id;
                mmc.each(function () {
                    if (this.hash == "#" + pageid) {
                        $(this).addClass('active');
                        return false;
                    }
                });
                isopen = true;
                return false;
            }
        });
        if (!isopen) {
            var pageid = "page_" + new Date().valueOf(), close = close == false ? '' : '<em class="fa fa-close"></em>';
            mmc.end().append('<a href="#' + pageid + '" class="active">' + title + close + '</a></li>');
            mb.append('<div class="tab-pane active" id="' + pageid + '"><iframe frameborder="0" src="about:blank"></iframe></div>');
            $('#' + pageid).find('iframe')[0].src = url;
        }

        //定位、调整
        rf.PositionTab();
        rf.IframeAuto();

        //Mobile 打开时隐藏菜单导航
        if (!rf.isPC()) {
            var mt = $('#menu-toggler');
            mt.hasClass('display') && $('#menu-toggler')[0].click();
        }
    },
    //Iframe自适应、延迟响应
    IframeAuto: function () {
        clearTimeout(window.deferIA);
        window.deferIA = setTimeout(function () {
            var box = $('#mtabox'), sh = $(window).height() - box.offset().top;
            box.children('div').css("height", sh);
        }, 100);
    },
    //JSON生成导航菜单
    TreeEach: function (json) {
        //拼接HTML
        rf.htm = rf.htm || '';

        for (var i = 0; i < json.length; i++) {
            //遍历对象
            var text = json[i]["text"] || '',
                icon = json[i]["ext2"] || '',
                url = json[i]['ext1'] || '',
                subs = json[i]["children"] || [];

            icon != '' && (icon = "fa " + icon);

            //有下级
            if (subs.length) {
                rf.htm += '<li><a href="#" class="dropdown-toggle"><i class="menu-icon ' + icon + '"></i>'
                    + '<span class="menu-text"> ' + text + ' </span><b class="arrow fa fa-angle-down"></b></a>'
                    + '<ul class="submenu">';
            } else {
                rf.htm += '<li><a href="#' + url + '"><i class="menu-icon ' + icon + '"></i>'
                    + '<span class="menu-text"> ' + text + ' </span></a></li>';
            }

            //递归
            subs.length && arguments.callee(subs, subs.length);

            //同一层的最后一个
            if (i + 1 == arguments[1]) {
                rf.htm += '</ul></li>';
            }
        }
        return rf.htm;
    },
    //载入导航菜单
    loadNav: function () {
        $.ajax({
            url: '/Common/QueryMenu',
            type: 'post',
            dataType: 'json',
            success: function (data) {
                $('#ulnav').data('nav', data);
                $('#ulnav').append(rf.TreeEach(data));
            },
            error: function (xhr) {
                if (xhr.status == 401) {
                    location.reload(true);
                } else {
                    alert("加载菜单出错，请重试；如一直存在请联系我们");
                }
            },
            complete: function () {
                //恢复设置
                rf.setNavType();

                //清除透明
                setTimeout(function () {
                    $('#LoadingMask').fadeOut(500).hide(500);
                }, 0);
            }
        });
    }
};

//菜单设置
$('#sidebar-shortcuts-large').click(function (e) {
    e = e || window.event;
    var target = e.target || e.srcElement;
    if ($('#sidebar-collapse')[0].contains(target)) {
        $('#sidebar').hasClass('menu-min') ? $('#sidebar').removeClass('menu-min') : $('#sidebar').addClass('menu-min');
    }
    setTimeout(function () {
        if ($('#sidebar').hasClass("menu-min")) {
            $('#divTheme').show();
            $('#btn_style_config').show();
        } else {
            if ($('#sidebar').hasClass("compact")) {
                $('#divTheme').hide();
                $('#btn_style_config').hide();
            } else {
                $('#divTheme').show();
                $('#btn_style_config').show();
            }
        }
    }, 50)
});
//浮动
$('#ulset').click(function (e) {
    var that = this;
    setTimeout(function () {
        var chks = $(that).find('input');
        rf.ls(rf.key.navtype, (chks[0].checked ? 1 : 0) + "" + (chks[1].checked ? 1 : 0))
    }, 50)
});
//折叠
$('#sidebar-collapse').click(function () {
    setTimeout(function () {
        rf.ls(rf.key.navmin, $('#sidebar').hasClass('menu-min') ? 1 : 0)
    }, 50);
});
//设置皮肤
$('#switch_skin').click(function (e) {
    e = e || window.event;
    var target = e.target || e.srcElement;
    if (target.nodeName == "A") {
        $(this).find('a').removeClass('selected');
        var skin = $(target).addClass('selected').attr('data-skin');
        document.body.className = skin;
        rf.ls(rf.key.navskin, skin);
    }
});
//样式配置
$('#btn_style_config').click(function () {
    rf.OpenPage('/setting/sysstyle', '<i class="fa fa-text-height"></i> 样式配置');
});
//点击选项卡
$('#mtab').click(function (e) {
    e = e || window.event;
    var target = e.target || e.srcElement;
    if (target.nodeName == "EM" && target.className.indexOf('fa-close') >= 0) {
        //关闭
        var ta = $(target).parent();
        if (ta.hasClass('active')) {
            ta.prev().addClass('active');
            $(ta[0].hash).prev().addClass('active');
        }
        $(ta[0].hash).remove();
        ta.remove();
        rf.PositionTab();
        return false;
    } else if ($(this).children('a')[0].contains(target)) {
        //左滑
        var mm = $('#mtab-main'), vw = mm.parent().width(),
            left = parseFloat(mm.css('left')) + (vw / 2);
        mm.css('left', Math.min(0, left));
    } else if ($(this).children('a').last()[0].contains(target)) {
        //右滑
        var mm = $('#mtab-main'), vw = mm.parent().width(),
            min = -1 * (mm[0].scrollWidth - mm.parent().width()),
            left = parseFloat(mm.css('left')) - (vw / 2);
        mm.css('left', Math.max(min, left));
    } else {
        var item = rf.contains($('#mtab-menu').children(), target);
        if (item) {
            //菜单项
            var cn = $(item).find('i')[0].className;
            if (cn.indexOf("fa-refresh") >= 0) {
                //刷新
                var currt = $('#mtabox').children('div.active').children();
                if (currt.length) {
                    currt[0].contentWindow.location.reload(false);
                }
            } else if (cn.indexOf("fa-close") >= 0) {
                //关闭其他
                var mmc = $('#mtab-main').children();
                mmc.each(function (i) {
                    if (i && this.className.indexOf("active") == -1) {
                        $(this.hash).remove();
                        $(this).remove();
                    }
                }).end().css('left', 0);
            } else if (cn.indexOf("fa-power-off") >= 0) {
                //关闭全部
                var mmc = $('#mtab-main').children();
                if (mmc.length) {
                    mmc.each(function (i) {
                        if (i) {
                            $(this.hash).remove();
                            $(this).remove();
                        }
                    }).first().addClass('active');
                    $(mmc.first()[0].hash).addClass('active');
                    mmc.end().css('left', 0);
                }
            }
        } else {
            var mmc = $('#mtab-main').children();
            item = rf.contains(mmc, target);
            if (item) {
                if (item.className.indexOf('active') == -1) {
                    //选项卡标签
                    mmc.removeClass('active');
                    $(item).addClass("active");
                    $('#mtabox').children().removeClass('active');
                    $(item.hash).addClass('active');
                    rf.PositionTab();
                }
                return false;
            }
        }
    }
});
//点击左侧导航
$('#ulnav').click(function (e) {
    if (e && e.preventDefault) { e.preventDefault() } else { window.event.returnValue = false }
    e = e || window.event;
    var target = e.target || e.srcElement;
    $(this).find('a').each(function () {
        if (this.contains(target)) {
            if (this.href.split('#')[1]) {
                rf.OpenPage(this.href.split('#')[1], this.innerHTML);
            }
            return false;
        }
    });
});

//点击个人菜单
$('#usermenu').click(function (e) {
    e = e || window.event;
    var target = e.target || e.srcElement, ct;
    $(this).find('a').each(function () {
        if (this.contains(target)) {
            ct = this;
            return false;
        }
    });
    if (ct && ct.hash) {
        switch (ct.hash) {
            case "#updatepassword":
                rf.OpenPage('/account/updatepassword', '<i class="fa fa-edit"></i> 修改密码');
                break;
        }

        if (e.preventDefault) {
            e.preventDefault()
        } else {
            window.event.returnValue = false
        }
    }
});

$(window).resize(rf.IframeAuto);

//恢复设置
rf.setSkinStyle();
//载入导航
rf.loadNav();

//打开页面 桌面（默认第一个，不能关闭，不然会影响：关闭其他、关闭全部）
rf.OpenPage('/home/desk', '<i class="fa fa-home"></i> 桌面', false);

setTimeout(function () {
    rf.OpenPage('https://rf.netnr.com', '<i class="fa fa-flag"></i> netnrf');
}, 1000 * 3);