/**
 * statuspage.io output for graphout
 */
var spioHelper = require('./statuspageio-helper');

// constructor
var StatusPageIoOutput = module.exports = function(events, log, params) {
    // let's first validate required params
    validateParams(params);

    var statuspage_opts = {
        api_key: params.api_key,
        page_id: params.page_id
    }

    var Spio = new spioHelper(statuspage_opts),
        statuspage_io_metrics = [];

    // first get provider id, wich will be used to get custom metrics
    Spio.getMetricsProviders("Self", function(err, provider) {
        // stop if we can't get provider id (with type == "self")
        if (err) {
            log.error("stopping output", err.message);
            return;
        }

        //
        log.info("got provider", {provider_id: provider.id});

        // refresh metrics each interval
        (function sendLoop() {
            Spio.getMetrics(provider.id, function(err, metrics) {
                if (err) {
                    log.error(err.message);
                    return setTimeout(sendLoop, params.send_interval);
                }

                log.debug("refreshed metrics metadata from statuspage.io", metrics);
                statuspage_io_metrics = metrics;

                // return, if metrics no metrics to send
                if (Spio.countMetrics() === 0) {
                    return setTimeout(sendLoop, params.send_interval);
                }

                log.info('sending', Spio.countMetrics(), 'metrics (' + Spio.countDataPoints(), 'data-points)');
                Spio.sendMetrics(function(err) {
                    if (err) log.error(err.message);
                    setTimeout(sendLoop, params.send_interval);
                });
            });
        })();

        // add item to payload on result
        events.on('result', function(result, options) {
            var metric = statuspage_io_metrics.find(function(metric) {
                return metric.name === options.name;
            });

            if (!metric) {
                log.warn("cannot find statuspage.io metric named", options.name);
                return;
            }

            log.debug('adding metric', {id: metric.id, name: metric.name, value: result});
            Spio.addMetric(metric.id, result);
        });
    });
};

function validateParams(params) {
    ['api_key', 'page_id'].forEach(function(param) {
        if (typeof params[param] === 'undefined')
            throw new Error('param ' + param + ' missing');
    });

    // check for metrics send_interval param
    if (typeof params.send_interval === 'undefined') {
        params.send_interval = 60
    }

    // check that minimum is 60 seconds, and maximum 5 minutes
    if (params.send_interval < 30 || params.send_interval > 300) {
        throw new Error('param send_interval must be between 60 and 300 seconds');
    }

    // convert to miliseconds
    params.send_interval *= 1000
}
