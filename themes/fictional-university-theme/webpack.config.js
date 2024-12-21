/*
  SUPER IMPORTANT: This config assumes your theme folder is named
  exactly 'fictional-university-theme' and that you have a folder
  inside it named 'bundled-assets' - If you'd like to adapt this
  config to work with your own custom folder structure and names
  be sure to adjust the publicPath value on line #116. You do NOT
  need to update any of the other publicPath settings in this file,
  only the one on line #116.
*/

const currentTask = process.env.npm_lifecycle_event;
const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const { WebpackManifestPlugin } = require("webpack-manifest-plugin");
const fse = require("fs-extra");

const postCSSPlugins = [
    require('postcss-import'),
    require('postcss-mixins'),
    require('postcss-simple-vars'),
    require('postcss-nested'),
    require('autoprefixer'),
    require('cssnano') 
];

class RunAfterCompile {
  apply(compiler) {
    compiler.hooks.done.tap("Update functions.php", function () {
      const manifest = fse.readJsonSync("./bundled-assets/manifest.json");

      fse.readFile("./functions.php", "utf8", function (err, data) {
        if (err) {
          console.log(err);
          return;
        }

        const scriptsRegEx = new RegExp("/bundled-assets/scripts.+?'", "g");
        const vendorsRegEx = new RegExp("/bundled-assets/vendors.+?'", "g");
        const cssRegEx = new RegExp("/bundled-assets/styles.+?'", "g");

        let result = data
          .replace(scriptsRegEx, `/bundled-assets/${manifest["scripts.js"]}'`)
          .replace(vendorsRegEx, `/bundled-assets/${manifest["vendors~scripts.js"]}'`)
          .replace(cssRegEx, `/bundled-assets/${manifest["scripts.css"]}'`);

        fse.writeFile("./functions.php", result, "utf8", function (err) {
          if (err) console.log(err);
        });
      });
    });
  }
}

let cssConfig = {
  test: /\.css$/i,
  use: [
    "css-loader?url=false",
    { loader: "postcss-loader", options: { postcssOptions: { plugins: postCSSPlugins } } },
  ],
};

let config = {
  entry: {
    scripts: "./js/scripts.js",
  },
  plugins: [
    new WebpackManifestPlugin({
      fileName: "manifest.json",
    }),
  ],
  module: {
    rules: [
      cssConfig,
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              "@babel/preset-react", 
              ["@babel/preset-env", { targets: { node: "20" } }]
            ],
          },
        },
      },
    ],
  },
};

if (currentTask === "devFast") {
  config.devtool = "source-map";
  cssConfig.use.unshift("style-loader");
  config.output = {
    filename: "bundled.js",
    publicPath: "http://localhost:3000/",
  };
  config.devServer = {
    before: function (app, server) {
      server._watch(["./**/*.php", "!./functions.php"]);
    },
    public: "http://localhost:3000",
    publicPath: "http://localhost:3000/",
    disableHostCheck: true,
    static: {
      directory: path.join(__dirname),
      publicPath: "http://localhost:3000/",
    },
    hot: true,
    port: 3000,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  };
  config.mode = "development";
}

if (currentTask === "build" || currentTask === "buildWatch") {
  cssConfig.use.unshift(MiniCssExtractPlugin.loader);
  postCSSPlugins.push(require("cssnano"));
  config.output = {
    publicPath: "/wp-content/themes/fictional-university-theme/bundled-assets/",
    filename: "[name].[contenthash].js",
    chunkFilename: "[name].[contenthash].js",
    path: path.resolve(__dirname, "bundled-assets"),
  };
  config.mode = "production";
  config.optimization = {
    splitChunks: { chunks: "all" },
  };
  config.plugins.push(
    new CleanWebpackPlugin(),
    new MiniCssExtractPlugin({ filename: "styles.[contenthash].css" }),
    new WebpackManifestPlugin({ publicPath: "" }),
    new RunAfterCompile()
  );
}

module.exports = config;
