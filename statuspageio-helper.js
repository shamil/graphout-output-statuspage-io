var debug   = require('debug')('statuspageio-helper'),
    needle  = require('needle'),
    sprintf = require('util').format;

const API_BASE_ENDPOINT = 'https://api.statuspage.io/v1/pages';

var SpioHelper = module.exports = function(opts) {
    if (!opts.api_key || !opts.page_id) {
        throw new Error('api_key & page_id must be specified');
    };

    this.api_key = opts.api_key;
    this.page_id = opts.page_id;

    // default HTTP requst params
    this.request_params = {
        json: true,
        open_timeout: parseInt(opts.timeout) || 10000, // set timeout for establishing connection
        headers: {
            'Authorization': 'OAuth ' + this.api_key,
            'Content-Type': 'application/json'
        }
    }

    // prepare items array
    this.clearMetrics();
}

SpioHelper.prototype.addMetric = function(metric_id, timestamp, value) {
    if (arguments.length < 3) {
        if (arguments.length < 2) {
            throw new Error('addMetric requires 2 or 3 arguments');
        }

        // if just 2 args provided
        value     = timestamp;
        timestamp = Date.now() / 1000 | 0;
    }

    if (this.metrics[metric_id]) {
        this.metrics[metric_id].push({timestamp: timestamp, value: value});
    }
    else {
        this.metrics[metric_id] = [{timestamp: timestamp, value: value}];
    }

    return this;
}

SpioHelper.prototype.clearMetrics = function() {
    this.metrics = {};
    return this;
}

SpioHelper.prototype.countMetrics = function() {
    var count = 0;
    for (var metric in this.metrics) {
        count += this.metrics[metric].length;
    }

    return count;
}

SpioHelper.prototype.sendMetrics = function(callback) {
    var request_url = sprintf('%s/%s/metrics/data.json', API_BASE_ENDPOINT, this.page_id);

    // make sure callback is a function
    callback = (typeof callback === 'function') ? callback : function() {};

    var self    = this,
        metrics = this.metrics,
        data    = {data: metrics};

    // enable by setting environment variable, like: DEBUG=statuspageio-helper
    debug(JSON.stringify(data));

    // reset the metrics object
    this.clearMetrics();

    needle.post(request_url, data, this.request_params, function(err, res, body) {
        if (err) {
            Object.assign(metrics, self.metrics); // put the metrics back
            return callback(err);
        }

        if (res.statusCode !== 202) {
            Object.assign(metrics, self.metrics); // put the metrics back
            err = new Error(body.error);
            return callback(err);
        }

        callback(null);
    });
}

SpioHelper.prototype.getMetrics = function(provider_id, callback) {
    var request_url = sprintf('%s/%s/metrics_providers/%s/metrics.json', API_BASE_ENDPOINT, this.page_id, provider_id);

    // make sure callback is a function
    callback = (typeof callback === 'function') ? callback : function() {};

    // if provider_id not specified, we should get metrics for all providers
    if (arguments.length === 1 && typeof provider_id === 'function') {
        callback    = provider_id;
        request_url = sprintf('%s/%s/metrics.json', API_BASE_ENDPOINT, this.page_id);
    }

    needle.get(request_url, this.request_params, function(err, response, body) {
        if (err) {
            return callback(err);
        }

        if (response.statusCode !== 200) {
            err = new Error(body.error);
            return callback(err);
        }

        callback(null, body);
    });
}

SpioHelper.prototype.getMetricsProviders = function(type, callback) {
    var request_url = sprintf('%s/%s/metrics_providers.json', API_BASE_ENDPOINT, this.page_id);

    // make sure callback is a function
    callback = (typeof callback === 'function') ? callback : function() {};

    // if type not specified, we should get all providers
    if (arguments.length === 1 && typeof type === 'function') {
        callback = type;
        type = undefined;
    }

    needle.get(request_url, this.request_params, function(err, response, body) {
        if (err) {
            return callback(err);
        }

        if (response.statusCode !== 200) {
            err = new Error(body.error);
            return callback(err);
        }

        // get only the requested type
        if (type) {
            body = body.find(function(provider) {
                return provider.type === type;
            });

            if (!body) {
                err = new Error(sprintf("couldn't get provider of %s type", type));
                return callback(err);
            }
        }

        callback(null, body);
    });
}
