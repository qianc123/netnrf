﻿using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Data.SqlClient;
using System.IO;
using System.Linq;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Netnr.Data;
using Netnr.Domain;
using Netnr.Func.ViewModel;
using Newtonsoft.Json.Linq;

namespace Netnr.ResponseFramework.Controllers
{
    /// <summary>
    /// 工具
    /// </summary>
    public class ToolController : Controller
    {
        public IActionResult Index()
        {
            return Content("Tool");
        }

        [Description("获取scripts")]
        public string QueryScripts(string typedb, string cmd)
        {
            string ext = ".sql";
            if (cmd == "pd")
            {
                ext = ".pdm";
            }
            var sql = Core.FileTo.ReadText(GlobalVar.WebRootPath + $"/scripts/table-{cmd}/", typedb.ToLower() + ext);
            return sql;
        }

        [Description("重置数据库")]
        public string ResetDataBase()
        {
            var list = new List<string>()
            {
                "很抱歉，目前该功能已搁置",
                "你可以把项目部署本地运行",
                "当你发现数据异常需要重置数据库时，你可以进群联反馈",
                "感谢你！"
            };
            return string.Join(Environment.NewLine + Environment.NewLine, list);
        }

        #region 表管理

        [Description("表管理")]
        public IActionResult TableManage()
        {
            return View();
        }

        [Description("查询数据库表与表配置信息")]
        public string QueryTableConfig()
        {
            var or = new QueryDataVM.OutputResult();

            using (var db = new ContextBase())
            {
                var queryHas = from a in db.SysTableConfig
                               group a by a.TableName into g
                               select g.Key;

                var listHas = queryHas.ToList();

                var dbname = db.Database.GetDbConnection().Database;

                var sql = QueryScripts(db.TDB.ToString(), "name").Replace("@DataBaseName", dbname);

                var dt = new DataTable();

                var listRow = new List<object>();
                if (!string.IsNullOrWhiteSpace(sql))
                {
                    using (var conn = db.Database.GetDbConnection())
                    {
                        conn.Open();
                        var cmd = conn.CreateCommand();
                        cmd.CommandText = sql;
                        dt.Load(cmd.ExecuteReader());
                    }
                    foreach (DataRow dr in dt.Rows)
                    {
                        var key = dr[0].ToString();
                        var val = (listHas.Exists(x => x.ToLower() == key.ToLower()) ? "1" : "");
                        var row = new JObject();
                        row["name"] = key;
                        row["exists"] = val;
                        listRow.Add(row);
                    }
                }
                or.data = listRow;
                or.total = listRow.Count;
            }

            return or.ToJson();
        }

        /// <summary>
        /// 建立表配置信息
        /// </summary>
        /// <param name="names">表名，逗号分割</param>
        /// <param name="cover">1覆盖</param>
        /// <returns></returns>
        [Description("建立表配置信息")]
        public string BuildTableConfig(string names, int cover)
        {
            using (var db = new ContextBase())
            {
                var listName = names.Split(',');

                var dbtype = db.TDB.ToString().ToLower();
                var dbname = db.Database.GetDbConnection().Database;
                var sqltemplate = QueryScripts(db.TDB.ToString(), "config");

                foreach (var name in listName)
                {
                    var sql = sqltemplate.Replace("@DataBaseName", dbname).Replace("@TableName", name);

                    if (!string.IsNullOrWhiteSpace(sql))
                    {
                        var dt = new DataTable();

                        using (var dbsql = new ContextBase())
                        {
                            using (var conn = dbsql.Database.GetDbConnection())
                            {
                                conn.Open();
                                var cmd = conn.CreateCommand();
                                cmd.CommandText = sql;
                                dt.Load(cmd.ExecuteReader());
                            }
                        }

                        if (dt.Rows.Count > 0)
                        {
                            if (cover == 1)
                            {
                                var oldmo = db.SysTableConfig.Where(x => x.TableName == name).ToList();
                                db.SysTableConfig.RemoveRange(oldmo);
                            }

                            var listMo = dt.ToModel<SysTableConfig>();
                            db.SysTableConfig.AddRange(listMo);
                            db.SaveChanges();
                        }
                    }
                }
            }
            return "success";
        }

        /// <summary>
        /// 查询数据库表信息
        /// </summary>
        /// <param name="names">表名，逗号分割</param>
        /// <returns></returns>
        [Description("查询数据库表信息")]
        public string QueryTableInfo(string names)
        {
            var listName = names.Split(',').ToList();
            var innames = string.Join("','", listName);

            var or = new QueryDataVM.OutputResult();

            var dt = new DataTable();

            ContextBase.TypeDB tdb;
            using (var db = new ContextBase())
            {
                tdb = db.TDB;

                var dbname = db.Database.GetDbConnection().Database;

                var sql = QueryScripts(db.TDB.ToString(), "info").Replace("@DataBaseName", dbname).Replace("@TableName", innames);

                if (!string.IsNullOrWhiteSpace(sql))
                {
                    using (var conn = db.Database.GetDbConnection())
                    {
                        conn.Open();
                        var cmd = conn.CreateCommand();
                        cmd.CommandText = sql;
                        dt.Load(cmd.ExecuteReader());
                    }
                }
                or.data = dt;
                or.total = dt.Rows.Count;
            }

            #region 其它处理
            //mysql默认值，单独查询
            switch (tdb)
            {
                case ContextBase.TypeDB.MySql:
                    using (var db = new ContextBase())
                    {
                        var conn = db.Database.GetDbConnection();
                        conn.Open();
                        var cmd = conn.CreateCommand();
                        foreach (var name in listName)
                        {
                            cmd.CommandText = "desc " + name + ";";

                            var dtdefault = new DataTable();
                            dtdefault.Load(cmd.ExecuteReader());

                            foreach (DataRow dr in dt.Rows)
                            {
                                if (dr["表名"].ToString().ToLower() == name.ToLower())
                                {
                                    var dv = dtdefault.Select("Field='" + dr["字段名"].ToString() + "'")[0]["Default"];
                                    if (dv != DBNull.Value)
                                    {
                                        dr["默认值"] = dv;
                                    }
                                }
                            }
                        }
                        cmd.Dispose();
                        conn.Dispose();
                    }
                    break;
            }
            #endregion

            return or.ToJson();
        }
        #endregion
    }
}